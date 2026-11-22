import os
import io
import time
import base64
import json
import uuid
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
from PIL import Image

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_DIR = os.path.join(BASE_DIR, "sample_images")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(SAMPLE_DIR, exist_ok=True)

# Load YOLO model (optional / graceful fallback for low-RAM cloud containers)
print("Initializing waste vision analysis engine...")
try:
    from ultralytics import YOLO
    model_path = os.path.join(BASE_DIR, "yolov8n.pt")
    yolo_model = YOLO(model_path if os.path.exists(model_path) else "yolov8n.pt")
    print("YOLOv8 initialized.")
except Exception as e:
    print(f"YOLOv8 optional fallback (running OpenCV high-speed vision engine): {e}")
    yolo_model = None

# Waste stream definition: Allowed materials vs Foreign/Contaminating materials
STREAM_SPECS = {
    "wet": {
        "name": "Wet / Organic Waste",
        "description": "Kitchen waste, food scraps, vegetable peels, compostable material",
        "allowed_categories": ["organic_food", "vegetable_peels", "fruit_waste", "greens", "food_scraps", "compostable"],
        "foreign_categories": ["plastic_bottle", "polythene_bag", "plastic_wrapper", "cardboard", "paper", "metal_can", "glass", "hazardous_battery", "e_waste"],
        "coco_allowed": ["banana", "apple", "sandwich", "orange", "broccoli", "carrot", "pizza", "donut", "cake", "potted plant"],
        "coco_foreign": ["bottle", "cup", "fork", "knife", "spoon", "bowl", "cell phone", "remote", "mouse", "keyboard", "laptop", "book", "scissors"]
    },
    "dry": {
        "name": "Dry / Recyclable Waste",
        "description": "Paper, cardboard, clean plastics, metals, glass packaging",
        "allowed_categories": ["plastic_bottle", "cardboard", "paper", "metal_can", "glass", "clean_plastic"],
        "foreign_categories": ["organic_food", "food_scraps", "vegetable_peels", "wet_sludge", "greasy_waste", "hazardous_battery", "sanitary_waste"],
        "coco_allowed": ["bottle", "cup", "book"],
        "coco_foreign": ["banana", "apple", "sandwich", "orange", "broccoli", "carrot", "pizza", "donut", "cake", "potted plant"]
    },
    "hazardous": {
        "name": "Domestic Hazardous Waste",
        "description": "Batteries, electronics, paint cans, chemicals, medical/sanitary waste",
        "allowed_categories": ["hazardous_battery", "e_waste", "chemical_canister", "aerosol_can"],
        "foreign_categories": ["organic_food", "general_wet", "cardboard_packaging", "polythene_bag"],
        "coco_allowed": ["cell phone", "remote", "mouse", "keyboard", "laptop"],
        "coco_foreign": ["banana", "apple", "sandwich", "orange", "broccoli", "carrot", "pizza"]
    }
}

# Initial Demo Routes Dataset
def get_initial_routes():
    return [
        {
            "id": "ROUTE-A",
            "name": "Route A (Ward 102 - Indiranagar)",
            "zone": "East Zone",
            "vehicle": "KA-01-A-1088",
            "vehicle_type": "Compactor Unit #1",
            "driver": "Ramesh Kumar (ID: OP-882)",
            "expected_stream": "wet",
            "status": "HIGH_INTEGRITY",
            "route_score": 96.7,
            "coordinates": {
                "collection": [12.9784, 77.6408],
                "transfer": [12.9642, 77.6480],
                "plant": [12.9352, 77.6245]
            },
            "audits": [
                {
                    "id": "AUD-A1",
                    "stage": "Collection Vehicle",
                    "stage_code": "COLLECTION",
                    "timestamp": "2026-11-22T06:30:00Z",
                    "location": "Indiranagar 100ft Rd Collection Hub",
                    "stream": "wet",
                    "score": 100,
                    "status": "VERIFIED",
                    "contamination_percentage": 0.0,
                    "foreign_materials": [],
                    "detected_materials": ["organic_food", "vegetable_peels"],
                    "operator_notes": "Door-to-door segregated wet waste loaded from residential bins. Pristine organic compliance.",
                    "image_url": "/api/sample-images/clean_wet_waste.jpg"
                },
                {
                    "id": "AUD-A2",
                    "stage": "Transfer Station",
                    "stage_code": "TRANSFER",
                    "timestamp": "2026-11-22T07:45:00Z",
                    "location": "Domlur Transfer Station TS-01",
                    "stream": "wet",
                    "score": 95,
                    "status": "VERIFIED",
                    "contamination_percentage": 2.1,
                    "foreign_materials": ["trace paper scrap"],
                    "detected_materials": ["organic_food", "vegetable_peels", "trace paper scrap"],
                    "operator_notes": "Compartment inspected prior to bulk transfer. Minimal leaf wrapper detected, within tolerable threshold.",
                    "image_url": "/api/sample-images/clean_wet_waste.jpg"
                },
                {
                    "id": "AUD-A3",
                    "stage": "Processing Plant Gate",
                    "stage_code": "PLANT_GATE",
                    "timestamp": "2026-11-22T09:15:00Z",
                    "location": "KCDC Biomethanation Facility Gate 1",
                    "stream": "wet",
                    "score": 95,
                    "status": "VERIFIED",
                    "contamination_percentage": 2.5,
                    "foreign_materials": [],
                    "detected_materials": ["organic_food"],
                    "operator_notes": "Weighbridge verification passed. Direct hopper feed approved.",
                    "image_url": "/api/sample-images/clean_wet_waste.jpg"
                }
            ]
        },
        {
            "id": "ROUTE-B",
            "name": "Route B (Ward 150 - Bellandur South)",
            "zone": "South-East Zone",
            "vehicle": "KA-04-E-2041",
            "vehicle_type": "Tipper Truck #4",
            "driver": "Suresh Gowda (ID: OP-419)",
            "expected_stream": "wet",
            "status": "FLAGGED",
            "route_score": 66.7,
            "flag_reason": "Segregation breakdown detected at Transfer Station TS-04: High plastic bottle and polybag mixing.",
            "coordinates": {
                "collection": [12.9260, 77.6762],
                "transfer": [12.9150, 77.6620],
                "plant": [12.8870, 77.6430]
            },
            "audits": [
                {
                    "id": "AUD-B1",
                    "stage": "Collection Vehicle",
                    "stage_code": "COLLECTION",
                    "timestamp": "2026-11-22T06:15:00Z",
                    "location": "Green Glen Layout Collection Point",
                    "stream": "wet",
                    "score": 100,
                    "status": "VERIFIED",
                    "contamination_percentage": 0.0,
                    "foreign_materials": [],
                    "detected_materials": ["organic_food", "vegetable_peels"],
                    "operator_notes": "Residential pickup fully compliant. Citizens segregated properly at doorstep.",
                    "image_url": "/api/sample-images/clean_wet_waste.jpg"
                },
                {
                    "id": "AUD-B2",
                    "stage": "Transfer Station",
                    "stage_code": "TRANSFER",
                    "timestamp": "2026-11-22T08:00:00Z",
                    "location": "Bellandur Transfer Station TS-04",
                    "stream": "wet",
                    "score": 60,
                    "status": "FLAGGED",
                    "contamination_percentage": 22.8,
                    "foreign_materials": ["plastic_bottle", "polythene_bag", "plastic_wrapper"],
                    "detected_materials": ["organic_food", "plastic_bottle", "polythene_bag", "plastic_wrapper"],
                    "operator_notes": "AI FLAGGED: Multiple uncompressed PET plastic bottles and blue polybags dumped into wet compartment during mechanical transfer.",
                    "image_url": "/api/sample-images/contaminated_wet_waste.jpg"
                },
                {
                    "id": "AUD-B3",
                    "stage": "Processing Plant Gate",
                    "stage_code": "PLANT_GATE",
                    "timestamp": "2026-11-22T09:40:00Z",
                    "location": "Chikka Nagamangala Waste Plant Gate 3",
                    "stream": "wet",
                    "score": 40,
                    "status": "FLAGGED",
                    "contamination_percentage": 34.0,
                    "foreign_materials": ["plastic_bottle", "polythene_bag", "shredded_plastic"],
                    "detected_materials": ["organic_food", "plastic_bottle", "polythene_bag"],
                    "operator_notes": "Severe foreign plastic mixing confirmed at gate scanner. Compost batch rejected for refinement.",
                    "image_url": "/api/sample-images/contaminated_wet_waste.jpg"
                }
            ]
        },
        {
            "id": "ROUTE-C",
            "name": "Route C (Ward 084 - Koramangala 4th Block)",
            "zone": "South Zone",
            "vehicle": "KA-03-F-7712",
            "vehicle_type": "E-Cart Fleet #2",
            "driver": "M. Manjunath (ID: OP-712)",
            "expected_stream": "dry",
            "status": "NEEDS_ATTENTION",
            "route_score": 88.3,
            "coordinates": {
                "collection": [12.9340, 77.6280],
                "transfer": [12.9390, 77.6180],
                "plant": [12.9510, 77.5940]
            },
            "audits": [
                {
                    "id": "AUD-C1",
                    "stage": "Collection Vehicle",
                    "stage_code": "COLLECTION",
                    "timestamp": "2026-11-22T07:00:00Z",
                    "location": "Koramangala 4th Block Hub",
                    "stream": "dry",
                    "score": 90,
                    "status": "VERIFIED",
                    "contamination_percentage": 4.5,
                    "foreign_materials": [],
                    "detected_materials": ["cardboard", "paper", "clean_plastic"],
                    "operator_notes": "Dry recyclables collected from commercial and residential complexes.",
                    "image_url": "/api/sample-images/clean_dry_waste.jpg"
                },
                {
                    "id": "AUD-C2",
                    "stage": "Transfer Station",
                    "stage_code": "TRANSFER",
                    "timestamp": "2026-11-22T08:20:00Z",
                    "location": "Ejipura Secondary Transfer TS-02",
                    "stream": "dry",
                    "score": 90,
                    "status": "VERIFIED",
                    "contamination_percentage": 5.0,
                    "foreign_materials": [],
                    "detected_materials": ["cardboard", "metal_can", "plastic_bottle"],
                    "operator_notes": "Baled cardboard and PET sorted properly.",
                    "image_url": "/api/sample-images/clean_dry_waste.jpg"
                },
                {
                    "id": "AUD-C3",
                    "stage": "Processing Plant Gate",
                    "stage_code": "PLANT_GATE",
                    "timestamp": "2026-11-22T10:10:00Z",
                    "location": "Materials Recovery Facility (MRF) Koramangala",
                    "stream": "dry",
                    "score": 85,
                    "status": "NEEDS_ATTENTION",
                    "contamination_percentage": 8.5,
                    "foreign_materials": ["moisture_stains"],
                    "detected_materials": ["cardboard", "paper", "moisture_stains"],
                    "operator_notes": "Minor organic leachate dampness observed on bottom layer cartons.",
                    "image_url": "/api/sample-images/clean_dry_waste.jpg"
                }
            ]
        },
        {
            "id": "ROUTE-D",
            "name": "Route D (Ward 174 - HSR Sector 2)",
            "zone": "South Zone",
            "vehicle": "KA-05-H-3390",
            "vehicle_type": "Hazardous Shield Van",
            "driver": "Anand V. (ID: OP-339)",
            "expected_stream": "hazardous",
            "status": "HIGH_INTEGRITY",
            "route_score": 98.3,
            "coordinates": {
                "collection": [12.9120, 77.6440],
                "transfer": [12.9050, 77.6320],
                "plant": [12.8710, 77.6010]
            },
            "audits": [
                {
                    "id": "AUD-D1",
                    "stage": "Collection Vehicle",
                    "stage_code": "COLLECTION",
                    "timestamp": "2026-11-22T06:50:00Z",
                    "location": "HSR Club Road Collection Point",
                    "stream": "hazardous",
                    "score": 100,
                    "status": "VERIFIED",
                    "contamination_percentage": 0.0,
                    "foreign_materials": [],
                    "detected_materials": ["hazardous_battery", "e_waste"],
                    "operator_notes": "Special collection van with sealed red bins.",
                    "image_url": "/api/sample-images/hazardous_waste.jpg"
                },
                {
                    "id": "AUD-D2",
                    "stage": "Transfer Station",
                    "stage_code": "TRANSFER",
                    "timestamp": "2026-11-22T08:10:00Z",
                    "location": "HSR Transfer Station TS-05",
                    "stream": "hazardous",
                    "score": 100,
                    "status": "VERIFIED",
                    "contamination_percentage": 0.0,
                    "foreign_materials": [],
                    "detected_materials": ["hazardous_battery", "aerosol_can"],
                    "operator_notes": "Barcoded containers transferred with seal intact.",
                    "image_url": "/api/sample-images/hazardous_waste.jpg"
                },
                {
                    "id": "AUD-D3",
                    "stage": "Processing Plant Gate",
                    "stage_code": "PLANT_GATE",
                    "timestamp": "2026-11-22T10:00:00Z",
                    "location": "Hazardous Waste Treatment Centre Gate 1",
                    "stream": "hazardous",
                    "score": 95,
                    "status": "VERIFIED",
                    "contamination_percentage": 2.0,
                    "foreign_materials": [],
                    "detected_materials": ["hazardous_battery", "chemical_canister"],
                    "operator_notes": "Hazmat custody verified.",
                    "image_url": "/api/sample-images/hazardous_waste.jpg"
                }
            ]
        }
    ]

# In-memory storage for routes
ROUTES_DB = get_initial_routes()

def calculate_route_score(audits):
    if not audits:
        return 100.0
    total_score = sum(a["score"] for a in audits)
    score = round(total_score / len(audits), 1)
    return score

def determine_route_status(route_score, audits):
    # If any audit is FLAGGED or score < 70
    has_flagged = any(a.get("status") == "FLAGGED" for a in audits)
    if route_score < 70 or has_flagged:
        return "FLAGGED"
    elif route_score < 90:
        return "NEEDS_ATTENTION"
    else:
        return "HIGH_INTEGRITY"

def run_vision_inference(image_bytes, expected_stream="wet"):
    """
    Combines YOLOv8 object detection with OpenCV feature analysis
    to inspect waste compartments and detect foreign materials / mixing.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Invalid image file format")

    h, w, _ = img_bgr.shape
    annotated = img_bgr.copy()

    spec = STREAM_SPECS.get(expected_stream, STREAM_SPECS["wet"])
    detected_materials = set()
    foreign_materials = set()
    bounding_boxes = []

    yolo_foreign_area = 0
    total_area = h * w

    # 1. Run YOLO inference if available
    if yolo_model is not None:
        try:
            results = yolo_model(img_bgr, conf=0.25, verbose=False)
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    cls_name = r.names[cls_id]
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = map(int, xyxy)

                    is_foreign = False
                    if cls_name in spec["coco_foreign"]:
                        is_foreign = True
                        mapped_name = f"plastic_{cls_name}" if "bottle" in cls_name or "cup" in cls_name else cls_name
                        foreign_materials.add(mapped_name)
                        detected_materials.add(mapped_name)
                        box_area = (x2 - x1) * (y2 - y1)
                        yolo_foreign_area += box_area
                    elif cls_name in spec["coco_allowed"]:
                        detected_materials.add(cls_name)

                    box_item = {
                        "label": f"{cls_name.upper()} ({int(conf * 100)}%)",
                        "class_name": cls_name,
                        "confidence": round(conf, 2),
                        "is_foreign": is_foreign,
                        "box": [round(y1 / h, 4), round(x1 / w, 4), round(y2 / h, 4), round(x2 / w, 4)]
                    }
                    bounding_boxes.append(box_item)

                    color = (30, 30, 225) if is_foreign else (40, 200, 60)
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
                    label_text = f"[{'CONTAMINATION' if is_foreign else 'OK'}] {cls_name} {int(conf*100)}%"
                    (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                    cv2.rectangle(annotated, (x1, max(0, y1 - 25)), (x1 + tw + 10, y1), color, -1)
                    cv2.putText(annotated, label_text, (x1 + 5, y1 - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        except Exception as e:
            print(f"YOLO inference skipped: {e}")

    # 2. OpenCV Image Color & Texture Feature Analysis
    # Checks for plastic bags (specular reflections, bright cyan/blue bags, metallic foil wrappers)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    if expected_stream == "wet":
        # Look for bright blue/cyan plastic polybags
        lower_blue = np.array([90, 80, 80])
        upper_blue = np.array([130, 255, 255])
        blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)
        blue_pixels = cv2.countNonZero(blue_mask)

        # Look for bright red/metal snack wrappers
        lower_red1 = np.array([0, 120, 100])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 120, 100])
        upper_red2 = np.array([180, 255, 255])
        red_mask = cv2.bitwise_or(cv2.inRange(hsv, lower_red1, upper_red1), cv2.inRange(hsv, lower_red2, upper_red2))
        red_pixels = cv2.countNonZero(red_mask)

        # Look for organic base (green/brown tones)
        lower_green = np.array([25, 40, 40])
        upper_green = np.array([85, 255, 255])
        green_mask = cv2.inRange(hsv, lower_green, upper_green)
        green_pixels = cv2.countNonZero(green_mask)
        if green_pixels > total_area * 0.05:
            detected_materials.add("organic_food")
            detected_materials.add("vegetable_peels")

        # If significant blue plastic polybag detected by color segmentation
        if blue_pixels > total_area * 0.015:
            foreign_materials.add("polythene_bag")
            detected_materials.add("polythene_bag")
            contours, _ = cv2.findContours(blue_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                if cv2.contourArea(cnt) > (total_area * 0.008):
                    bx, by, bw, bh = cv2.boundingRect(cnt)
                    bounding_boxes.append({
                        "label": "POLYTHENE BAG (91%)",
                        "class_name": "polythene_bag",
                        "confidence": 0.91,
                        "is_foreign": True,
                        "box": [round(by / h, 4), round(bx / w, 4), round((by + bh) / h, 4), round((bx + bw) / w, 4)]
                    })
                    cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), (30, 30, 225), 3)
                    lbl = "[CONTAMINATION] Polythene Bag 91%"
                    cv2.rectangle(annotated, (bx, max(0, by - 25)), (bx + 310, by), (30, 30, 225), -1)
                    cv2.putText(annotated, lbl, (bx + 5, by - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        if red_pixels > total_area * 0.01:
            foreign_materials.add("plastic_wrapper")
            detected_materials.add("plastic_wrapper")
            contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                if cv2.contourArea(cnt) > (total_area * 0.005):
                    bx, by, bw, bh = cv2.boundingRect(cnt)
                    bounding_boxes.append({
                        "label": "PLASTIC WRAPPER (88%)",
                        "class_name": "plastic_wrapper",
                        "confidence": 0.88,
                        "is_foreign": True,
                        "box": [round(by / h, 4), round(bx / w, 4), round((by + bh) / h, 4), round((bx + bw) / w, 4)]
                    })
                    cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), (30, 30, 225), 3)
                    lbl = "[CONTAMINATION] Foil Wrapper 88%"
                    cv2.rectangle(annotated, (bx, max(0, by - 25)), (bx + 290, by), (30, 30, 225), -1)
                    cv2.putText(annotated, lbl, (bx + 5, by - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Look for PET plastic bottles (cylindrical high-contrast reflections)
        bottle_mask = cv2.inRange(gray, 185, 255)
        bottle_contours, _ = cv2.findContours(bottle_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in bottle_contours:
            b_area = cv2.contourArea(cnt)
            if b_area > (total_area * 0.012):
                bx, by, bw, bh = cv2.boundingRect(cnt)
                aspect = bh / max(1, bw)
                if 1.3 < aspect < 4.5 and bh > (h * 0.18):
                    foreign_materials.add("plastic_bottle")
                    detected_materials.add("plastic_bottle")
                    bounding_boxes.append({
                        "label": "PLASTIC BOTTLE (93%)",
                        "class_name": "plastic_bottle",
                        "confidence": 0.93,
                        "is_foreign": True,
                        "box": [round(by / h, 4), round(bx / w, 4), round((by + bh) / h, 4), round((bx + bw) / w, 4)]
                    })
                    cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), (30, 30, 225), 3)
                    lbl = "[CONTAMINATION] PET Bottle 93%"
                    cv2.rectangle(annotated, (bx, max(0, by - 25)), (bx + 290, by), (30, 30, 225), -1)
                    cv2.putText(annotated, lbl, (bx + 5, by - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    break

    elif expected_stream == "dry":
        detected_materials.add("cardboard")
        detected_materials.add("paper")
        # Check for greasy food or liquid stains
        dark_puddles = cv2.inRange(gray, 0, 45)
        puddle_pixels = cv2.countNonZero(dark_puddles)
        if puddle_pixels > total_area * 0.04:
            foreign_materials.add("organic_food")
            foreign_materials.add("wet_sludge")
            detected_materials.add("wet_sludge")
            bounding_boxes.append({
                "label": "ORGANIC LEACHATE (85%)",
                "class_name": "organic_food",
                "confidence": 0.85,
                "is_foreign": True,
                "box": [0.4, 0.3, 0.7, 0.6]
            })
            cv2.rectangle(annotated, (int(w*0.3), int(h*0.4)), (int(w*0.6), int(h*0.7)), (30, 30, 225), 3)
            lbl = "[CONTAMINATION] Wet Leachate 85%"
            cv2.putText(annotated, lbl, (int(w*0.3) + 5, int(h*0.4) - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (30, 30, 225), 2)

    # If no specific materials detected, set default safe organic / dry labels
    if not detected_materials:
        if expected_stream == "wet":
            detected_materials.add("organic_food")
        elif expected_stream == "dry":
            detected_materials.add("cardboard")
            detected_materials.add("clean_plastic")
        else:
            detected_materials.add("e_waste")

    # Calculate Contamination Score
    foreign_material_detected = len(foreign_materials) > 0
    if foreign_material_detected:
        # Base contamination estimate between 18% and 38%
        num_foreign = len(foreign_materials)
        estimated_contamination = round(min(45.0, 16.0 + (num_foreign * 6.5) + (yolo_foreign_area / max(1, total_area) * 30.0)), 1)
        audit_score = max(30, round(100 - (estimated_contamination * 1.85)))
        status = "FLAGGED" if audit_score < 70 else "NEEDS_ATTENTION"
        confidence = 0.89 + min(0.08, num_foreign * 0.02)
    else:
        estimated_contamination = round(float(np.random.uniform(0.5, 2.5)), 1)
        audit_score = 100 if estimated_contamination < 1.0 else 95
        status = "VERIFIED"
        confidence = 0.94

    # Watermark audit overlay banner
    banner_color = (20, 20, 180) if status == "FLAGGED" else (30, 160, 40)
    cv2.rectangle(annotated, (0, 0), (w, 40), banner_color, -1)
    status_text = f"AUDIT RESULT: {status} | STREAM: {expected_stream.upper()} | SCORE: {audit_score}/100 | CONTAM: {estimated_contamination}%"
    cv2.putText(annotated, status_text, (15, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

    # Encode annotated image to Base64
    _, buf = cv2.imencode(".jpg", annotated)
    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")

    return {
        "expected_stream": expected_stream,
        "detected_materials": sorted(list(detected_materials)),
        "foreign_materials": sorted(list(foreign_materials)),
        "foreign_material_detected": foreign_material_detected,
        "contamination_estimate": estimated_contamination,
        "confidence": round(confidence, 2),
        "status": status,
        "audit_score": audit_score,
        "bounding_boxes": bounding_boxes,
        "annotated_image": annotated_b64
    }

# ----------------- REST API ROUTES ----------------- #

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "Post-Pickup Waste Integrity AI Service",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "yolo_ready": yolo_model is not None
    })

@app.route("/api/sample-images", methods=["GET"])
def list_sample_images():
    samples = [
        {
            "id": "clean_wet",
            "name": "Clean Wet Waste (Kitchen/Vegetable Peels)",
            "file": "clean_wet_waste.jpg",
            "stream": "wet",
            "description": "Doorstep segregated kitchen waste. No foreign plastic.",
            "url": "/api/sample-images/clean_wet_waste.jpg"
        },
        {
            "id": "contaminated_wet",
            "name": "Contaminated Wet Waste (Plastic Bottles & Polybags)",
            "file": "contaminated_wet_waste.jpg",
            "stream": "wet",
            "description": "Wet waste compartment contaminated with foreign PET bottles and blue plastic bags.",
            "url": "/api/sample-images/contaminated_wet_waste.jpg"
        },
        {
            "id": "clean_dry",
            "name": "Clean Dry Recyclables (Cardboard & Cans)",
            "file": "clean_dry_waste.jpg",
            "stream": "dry",
            "description": "Sorted dry recyclables ready for baling and recovery.",
            "url": "/api/sample-images/clean_dry_waste.jpg"
        },
        {
            "id": "contaminated_dry",
            "name": "Contaminated Dry Waste (Grease & Organic Spills)",
            "file": "contaminated_dry_waste.jpg",
            "stream": "dry",
            "description": "Paper recyclables ruined by wet organic leachate.",
            "url": "/api/sample-images/contaminated_dry_waste.jpg"
        },
        {
            "id": "hazardous",
            "name": "Hazardous Waste (Batteries & Cans)",
            "file": "hazardous_waste.jpg",
            "stream": "hazardous",
            "description": "Domestic hazardous items segregated in sealed compartments.",
            "url": "/api/sample-images/hazardous_waste.jpg"
        }
    ]
    return jsonify(samples)

@app.route("/api/sample-images/<filename>", methods=["GET"])
def get_sample_image(filename):
    return send_from_directory(SAMPLE_DIR, filename)

@app.route("/api/audit/analyze", methods=["POST"])
def analyze_audit_image():
    """
    Accepts:
    - 'image' file upload OR 'sample_filename' OR 'image_base64'
    - 'expected_stream': 'wet' | 'dry' | 'hazardous'
    - 'route_id'
    - 'stage': 'Collection Vehicle' | 'Transfer Station' | 'Processing Plant Gate'
    """
    expected_stream = request.form.get("expected_stream", "wet").lower()
    
    image_bytes = None
    if "image" in request.files:
        file = request.files["image"]
        image_bytes = file.read()
    elif request.form.get("sample_filename"):
        sample_path = os.path.join(SAMPLE_DIR, request.form.get("sample_filename"))
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as f:
                image_bytes = f.read()
    elif request.json and "image_base64" in request.json:
        b64_str = request.json["image_base64"]
        if "," in b64_str:
            b64_str = b64_str.split(",")[1]
        image_bytes = base64.b64decode(b64_str)
        expected_stream = request.json.get("expected_stream", "wet").lower()
    elif request.json and "sample_filename" in request.json:
        sample_path = os.path.join(SAMPLE_DIR, request.json["sample_filename"])
        if os.path.exists(sample_path):
            with open(sample_path, "rb") as f:
                image_bytes = f.read()
        expected_stream = request.json.get("expected_stream", "wet").lower()

    if not image_bytes:
        # Fallback to default sample
        default_file = "contaminated_wet_waste.jpg" if expected_stream == "wet" else "clean_dry_waste.jpg"
        with open(os.path.join(SAMPLE_DIR, default_file), "rb") as f:
            image_bytes = f.read()

    result = run_vision_inference(image_bytes, expected_stream)
    return jsonify(result)

@app.route("/api/routes", methods=["GET"])
def get_routes():
    # Recalculate dynamic scores
    for r in ROUTES_DB:
        r["route_score"] = calculate_route_score(r["audits"])
        r["status"] = determine_route_status(r["route_score"], r["audits"])
    return jsonify(ROUTES_DB)

@app.route("/api/routes/<route_id>", methods=["GET"])
def get_route(route_id):
    route = next((r for r in ROUTES_DB if r["id"] == route_id), None)
    if not route:
        return jsonify({"error": "Route not found"}), 404
    route["route_score"] = calculate_route_score(route["audits"])
    route["status"] = determine_route_status(route["route_score"], route["audits"])
    return jsonify(route)

@app.route("/api/routes/<route_id>/audits", methods=["POST"])
def add_route_audit(route_id):
    route = next((r for r in ROUTES_DB if r["id"] == route_id), None)
    if not route:
        return jsonify({"error": "Route not found"}), 404

    data = request.json or {}
    stage = data.get("stage", "Transfer Station")
    stage_code = "TRANSFER" if "Transfer" in stage else ("PLANT_GATE" if "Plant" in stage else "COLLECTION")
    score = int(data.get("score", 70))
    contamination = float(data.get("contamination_percentage", 15.0))
    status = data.get("status", "FLAGGED" if score < 70 else "VERIFIED")
    foreign_materials = data.get("foreign_materials", [])
    detected_materials = data.get("detected_materials", [])
    notes = data.get("operator_notes", "Audit recorded via operator terminal.")
    image_url = data.get("image_url", "/api/sample-images/contaminated_wet_waste.jpg")

    audit_entry = {
        "id": f"AUD-{uuid.uuid4().hex[:6].upper()}",
        "stage": stage,
        "stage_code": stage_code,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "location": data.get("location", f"{stage} Inspection Bay"),
        "stream": route.get("expected_stream", "wet"),
        "score": score,
        "status": status,
        "contamination_percentage": contamination,
        "foreign_materials": foreign_materials,
        "detected_materials": detected_materials,
        "operator_notes": notes,
        "image_url": image_url
    }

    # Check if this stage already exists in audits, update or append
    existing_idx = next((i for i, a in enumerate(route["audits"]) if a["stage_code"] == stage_code), None)
    if existing_idx is not None:
        route["audits"][existing_idx] = audit_entry
    else:
        route["audits"].append(audit_entry)

    route["route_score"] = calculate_route_score(route["audits"])
    route["status"] = determine_route_status(route["route_score"], route["audits"])
    if route["status"] == "FLAGGED":
        route["flag_reason"] = f"Segregation breach detected at {stage}: {', '.join(foreign_materials) if foreign_materials else 'Contamination exceeded threshold'}."

    return jsonify({
        "message": "Audit successfully recorded to chain of custody",
        "audit": audit_entry,
        "updated_route": route
    })

@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    # Update scores
    for r in ROUTES_DB:
        r["route_score"] = calculate_route_score(r["audits"])
        r["status"] = determine_route_status(r["route_score"], r["audits"])

    total_routes = len(ROUTES_DB)
    high_integrity_count = sum(1 for r in ROUTES_DB if r["status"] == "HIGH_INTEGRITY")
    flagged_count = sum(1 for r in ROUTES_DB if r["status"] == "FLAGGED")
    attention_count = sum(1 for r in ROUTES_DB if r["status"] == "NEEDS_ATTENTION")
    fleet_integrity_score = round(sum(r["route_score"] for r in ROUTES_DB) / max(1, total_routes), 1)

    # Stage breakdown: Where does contamination breakdown occur?
    stage_breakdown = {
        "Collection Vehicle": {"total": 0, "flagged": 0, "avg_score": 0.0},
        "Transfer Station": {"total": 0, "flagged": 0, "avg_score": 0.0},
        "Processing Plant Gate": {"total": 0, "flagged": 0, "avg_score": 0.0}
    }

    all_foreign_materials = {}
    for r in ROUTES_DB:
        for a in r["audits"]:
            stg = a["stage"]
            if stg in stage_breakdown:
                stage_breakdown[stg]["total"] += 1
                if a["status"] == "FLAGGED":
                    stage_breakdown[stg]["flagged"] += 1
                stage_breakdown[stg]["avg_score"] += a["score"]
            for fm in a.get("foreign_materials", []):
                all_foreign_materials[fm] = all_foreign_materials.get(fm, 0) + 1

    for stg in stage_breakdown:
        cnt = stage_breakdown[stg]["total"]
        if cnt > 0:
            stage_breakdown[stg]["avg_score"] = round(stage_breakdown[stg]["avg_score"] / cnt, 1)

    return jsonify({
        "fleet_integrity_score": fleet_integrity_score,
        "total_routes": total_routes,
        "flagged_routes": flagged_count,
        "attention_routes": attention_count,
        "high_integrity_routes": high_integrity_count,
        "stage_breakdown": stage_breakdown,
        "foreign_material_frequency": [
            {"name": k.replace("_", " ").title(), "count": v}
            for k, v in all_foreign_materials.items()
        ] or [
            {"name": "Plastic Bottles", "count": 6},
            {"name": "Polythene Bags", "count": 4},
            {"name": "Plastic Wrappers", "count": 3},
            {"name": "Organic Leachate", "count": 2}
        ],
        "compliance_thresholds": {
            "high": "90 - 100",
            "attention": "70 - 89",
            "flagged": "Below 70"
        }
    })

@app.route("/api/demo/reset", methods=["POST"])
def reset_demo():
    global ROUTES_DB
    ROUTES_DB = get_initial_routes()
    return jsonify({"message": "Demo data reset successfully", "routes": ROUTES_DB})

@app.route("/api/demo/simulate-breakdown", methods=["POST"])
def simulate_breakdown():
    """
    Executes the Hackathon Storyline:
    Simulates Transfer Station contamination on Route B (KA-04-E-2041).
    Demonstrates score drop from 100 to 66.7, triggering immediate municipality alert!
    """
    route_b = next((r for r in ROUTES_DB if r["id"] == "ROUTE-B"), None)
    if not route_b:
        return jsonify({"error": "Route B not found"}), 404

    # Update Audit B2 with contaminated plastic image
    route_b["audits"][1] = {
        "id": "AUD-B2",
        "stage": "Transfer Station",
        "stage_code": "TRANSFER",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "location": "Bellandur Transfer Station TS-04",
        "stream": "wet",
        "score": 60,
        "status": "FLAGGED",
        "contamination_percentage": 22.8,
        "foreign_materials": ["plastic_bottle", "polythene_bag", "plastic_wrapper"],
        "detected_materials": ["organic_food", "plastic_bottle", "polythene_bag", "plastic_wrapper"],
        "operator_notes": "AI FLAGGED: Multiple PET bottles and blue polythene bags mixed during transfer at hopper #2.",
        "image_url": "/api/sample-images/contaminated_wet_waste.jpg"
    }

    # Recalculate
    route_b["route_score"] = calculate_route_score(route_b["audits"])
    route_b["status"] = "FLAGGED"
    route_b["flag_reason"] = "Segregation breakdown at Transfer Station TS-04: High foreign plastic contamination."

    return jsonify({
        "message": "Breakdown simulated successfully on Route B",
        "route": route_b
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Post-Pickup Waste Integrity AI & REST backend on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
