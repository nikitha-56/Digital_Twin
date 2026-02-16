"""Utility: train disease model and print evaluation summary.

Run: python -m services.train_disease_model
"""
from services import disease_model


def main():
    print("Training disease model (or loading existing)")
    clf = disease_model._ensure_model()
    print("Model ready. Stored at:", disease_model.MODEL_PATH)


if __name__ == "__main__":
    main()
