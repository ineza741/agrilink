"""
Pest & Disease Image Recognition Inference Script.

Called by the Node.js backend when a user uploads a crop image.

Production: Load a TensorFlow/Keras or PyTorch model trained on a
PlantVillage-like dataset (e.g. 30+ crop-disease classes).

Current: Returns a placeholder JSON so the frontend flow can be
developed end-to-end. Replace the model-loading block below with
actual inference code.
"""
import json
import sys
import os
from pathlib import Path

# ── Production model loader (uncomment when model file exists) ──────
# import tensorflow as tf
# import numpy as np
# from PIL import Image
#
# MODEL_PATH = Path(__file__).parent / "model" / "pest_model.h5"
# CLASS_NAMES = [
#     "Maize___Northern_Leaf_Blight", "Maize___Common_Rust",
#     "Maize___Fall_Armyworm", "Bean___Angular_Leaf_Spot", "Bean___Rust",
#     "Potato___Late_Blight", "Potato___Early_Blight",
#     "Sweet_Potato___Virus", "Cassava___Mosaic_Disease",
#     "Cassava___Brown_Streak", "Rice___Blast", "Rice___Brown_Spot",
#     "Wheat___Rust", "Tomato___Tomato_Mosaic_Virus",
#     "Banana___Black_Sigatoka", "Coffee___Leaf_Rust",
#     "Soybean___Rust", "Sorghum___Downy_Mildew",
#     # insect pests (when model supports them)
#     "insect_fall_armyworm", "insect_sweet_potato_weevil",
#     "insect_cassava_green_mite", "insect_rice_stem_borer",
#     "insect_wheat_aphid", "insect_tomato_leafminer",
#     "insect_banana_weevil", "insect_coffee_berry_borer",
#     "insect_potato_aphid",
# ]
# IMG_SIZE = (224, 224)
#
# def load_model():
#     return tf.keras.models.load_model(str(MODEL_PATH))
#
# def preprocess(image_path):
#     img = Image.open(image_path).convert("RGB").resize(IMG_SIZE)
#     arr = np.array(img) / 255.0
#     return np.expand_dims(arr, axis=0)
#
# def predict(model, image_path):
#     tensor = preprocess(image_path)
#     preds = model.predict(tensor, verbose=0)[0]
#     idx = int(np.argmax(preds))
#     return {
#         "predictedClass": CLASS_NAMES[idx],
#         "confidence": round(float(preds[idx]) * 100, 2),
#         "allScores": {CLASS_NAMES[i]: round(float(preds[i]) * 100, 2) for i in range(len(CLASS_NAMES))},
#     }


def placeholder_predict(image_path: str) -> dict:
    """Placeholder: return a deterministic "no model" result.

    In production, replace the entire body with a real model call.
    """
    from PIL import Image

    try:
        img = Image.open(image_path)
        w, h = img.size
        quality = "good" if min(w, h) >= 224 else "low"
    except Exception:
        quality = "unknown"

    return {
        "predictedClass": None,
        "confidence": None,
        "quality": quality,
        "message": "ML model not deployed. Install TensorFlow/Keras and place model at scripts/model/pest_model.h5",
        "modelVersion": None,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}), file=sys.stderr)
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.isfile(image_path):
        print(json.dumps({"error": f"File not found: {image_path}"}), file=sys.stderr)
        sys.exit(1)

    # ── Switch to real model when MODEL_PATH exists ──
    # model = load_model()
    # result = predict(model, image_path)

    result = placeholder_predict(image_path)

    print(json.dumps(result))
