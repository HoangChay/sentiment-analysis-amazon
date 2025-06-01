from flask import Flask, request, jsonify
from flask_cors import CORS  
import joblib

app = Flask(__name__)
CORS(app)

# Load mô hình và vectorizer
model = joblib.load("../model/lr_model.pkl")
vectorizer = joblib.load("../model/lr_vectorizer.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    review = data.get("review", "")
    if not review:
        return jsonify({"error": "No review text provided"}), 400
    X = vectorizer.transform([review])
    prediction = model.predict(X)[0]
    sentiment = "Positive" if prediction == 1 else "Negative"

    # Lấy top 3 từ/cụm từ có trọng số lớn nhất trong review (không dùng numpy)
    feature_names = vectorizer.get_feature_names_out()
    coefs = model.coef_[0]
    indices = X.nonzero()[1]
    word_weights = [(feature_names[i], coefs[i]) for i in indices]
    word_weights = sorted(word_weights, key=lambda x: abs(x[1]), reverse=True)
    keywords = [w for w, _ in word_weights[:3]]

    return jsonify({"sentiment": sentiment, "keywords": keywords})

if __name__ == "__main__":
    app.run(debug=True)