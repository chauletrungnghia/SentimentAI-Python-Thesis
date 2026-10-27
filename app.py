from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import re
from pathlib import Path
from urllib.parse import urlparse

# Các thư viện xử lý dữ liệu, Machine Learning và Trực quan hóa
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# Thiết lập thư mục làm việc và thư mục lưu biểu đồ
ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
PLOTS_DIR = ROOT / "plots"
PLOTS_DIR.mkdir(exist_ok=True)

# Biến toàn cục lưu kết quả đánh giá các mô hình để phục vụ hiển thị
MODEL_METRICS = {}

# =====================================================================
# 1. TIỀN XỬ LÝ DỮ LIỆU, HUẤN LUYỆN & ĐÁNH GIÁ ĐA MÔ HÌNH AI
# =====================================================================
def initialize_ml_system():
    global MODEL_METRICS
    csv_path = ROOT / "dataset.csv"
    
    # Bước 1: Đọc dữ liệu bằng Pandas từ file dataset.csv
    if csv_path.exists():
        df = pd.read_csv(csv_path, encoding='utf-8')
    else:
        # Dữ liệu dự phòng nếu chưa có file csv
        raw_data = {
            "text": [
                "Sản phẩm rất đẹp, giao hàng nhanh và đóng gói cẩn thận.",
                "Chất lượng tuyệt vời, dùng rất thích, đáng từng đồng.",
                "Hàng quá tệ, dùng được hai ngày thì hỏng, mất tiền oan.",
                "Chất lượng kém xa quảng cáo, giao hàng chậm trễ, thất vọng.",
                "Sản phẩm bình thường, không có gì đặc biệt, tạm ổn.",
                "Cũng được, giá tiền phù hợp với chất lượng tầm trung."
            ],
            "label": [
                "Positive", "Positive",
                "Negative", "Negative",
                "Neutral", "Neutral"
            ]
        }
        df = pd.DataFrame(raw_data)

    # Bước 2: Làm sạch dữ liệu và tiền xử lý văn bản
    df["text"] = df["text"].fillna("").astype(str)

    def preprocess_text(text):
        text = text.lower()
        # Loại bỏ ký tự đặc biệt, giữ lại chữ cái và dấu tiếng Việt
        text = re.sub(r"[^\w\sàáạảãâấầẩẫậăắằẳẵặèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ]", " ", text)
        return text.strip()

    df["clean_text"] = df["text"].apply(preprocess_text)

    # Bước 3: Trích xuất đặc trưng văn bản bằng TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(max_features=1000)
    X = vectorizer.fit_transform(df["clean_text"])
    y = df["label"]

    # Chia tập Train / Test (80% train, 20% test)
    test_sz = 0.2 if len(df) >= 10 else 0.3
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_sz, random_state=42)

    # --- Huấn luyện Mô hình 1: Logistic Regression ---
    lr_model = LogisticRegression()
    lr_model.fit(X_train, y_train)
    y_pred_lr = lr_model.predict(X_test)
    acc_lr = accuracy_score(y_test, y_pred_lr)
    f1_lr = f1_score(y_test, y_pred_lr, average="weighted", zero_division=0)

    # --- Huấn luyện Mô hình 2: Naive Bayes ---
    nb_model = MultinomialNB()
    nb_model.fit(X_train, y_train)
    y_pred_nb = nb_model.predict(X_test)
    acc_nb = accuracy_score(y_test, y_pred_nb)
    f1_nb = f1_score(y_test, y_pred_nb, average="weighted", zero_division=0)

    # --- Huấn luyện Mô hình 3: Support Vector Machine (SVM) ---
    svm_model = SVC(probability=True)
    svm_model.fit(X_train, y_train)
    y_pred_svm = svm_model.predict(X_test)
    acc_svm = accuracy_score(y_test, y_pred_svm)
    f1_svm = f1_score(y_test, y_pred_svm, average="weighted", zero_division=0)

    # Lưu lại chỉ số đánh giá của các mô hình
    MODEL_METRICS = {
        "Logistic Regression": {"accuracy": round(acc_lr, 2), "f1_score": round(f1_lr, 2)},
        "Naive Bayes": {"accuracy": round(acc_nb, 2), "f1_score": round(f1_nb, 2)},
        "Support Vector Machine (SVM)": {"accuracy": round(acc_svm, 2), "f1_score": round(f1_svm, 2)}
    }

    print("==========================================================")
    print("   KẾT QUẢ ĐÁNH GIÁ MÔ HÌNH HỌC MÁY (MACHINE LEARNING)")
    print("==========================================================")
    print(f"[AI Model 1 - Logistic Regression] Accuracy: {acc_lr:.2f} | F1-Score: {f1_lr:.2f}")
    print(f"[AI Model 2 - Naive Bayes]         Accuracy: {acc_nb:.2f} | F1-Score: {f1_nb:.2f}")
    print(f"[AI Model 3 - SVM Model]           Accuracy: {acc_svm:.2f} | F1-Score: {f1_svm:.2f}")
    print("==========================================================")

    # Bước 4: Trực quan hóa Confusion Matrix bằng Matplotlib & Seaborn
    plt.figure(figsize=(6, 5))
    cm = confusion_matrix(y_test, y_pred_lr, labels=["Positive", "Neutral", "Negative"])
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Positive", "Neutral", "Negative"],
                yticklabels=["Positive", "Neutral", "Negative"])
    plt.title("Confusion Matrix - Logistic Regression Model")
    plt.xlabel("Predicted Label")
    plt.ylabel("True Label")
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "confusion_matrix.png", dpi=150)
    plt.close()
    print("[INFO] Đã xuất biểu đồ Confusion Matrix thành công vào thư mục /plots.")

    return vectorizer, lr_model, preprocess_text

print("Đang khởi động hệ thống phân tích cảm xúc...")
vectorizer, model, preprocess_text = initialize_ml_system()


# =====================================================================
# 2. XỬ LÝ MÁY CHỦ WEB (WEB SERVER) & CÁC API DỊCH VỤ
# =====================================================================
class DashboardHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        
        # Trang chủ ứng dụng
        if path == "/":
            self.serve_file(STATIC / "index.html", "text/html; charset=utf-8")
        
        # Các file tĩnh tĩnh Css / JS
        elif path in ("/style.css", "/app.js"):
            file_path = STATIC / path.lstrip("/")
            content_type = "text/css; charset=utf-8" if path.endswith(".css") else "text/javascript; charset=utf-8"
            self.serve_file(file_path, content_type)
        
        # Route tĩnh phục vụ xem ảnh biểu đồ trực tiếp trên Web
        elif path.startswith("/plots/"):
            plot_name = path.replace("/plots/", "")
            plot_file = PLOTS_DIR / plot_name
            if plot_file.exists():
                self.serve_file(plot_file, "image/png")
            else:
                self.send_error(404)

        # API lấy thông tin trạng thái và số liệu đánh giá mô hình
        elif path == "/api/health":
            self.send_json({
                "status": "ok",
                "metrics": MODEL_METRICS
            })
        else:
            self.send_error(404)

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in ("/api/analyze", "/api/analyze-batch"):
            self.send_json({"error": "API not found"}, 404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(content_length))
            language = payload.get("language", "vi")

            sentiment_map_vi = {"Positive": "Tích cực", "Neutral": "Trung lập", "Negative": "Tiêu cực"}
            color_map = {"Positive": "#159b68", "Neutral": "#d49a22", "Negative": "#e55361"}

            # Xử lý Phân tích đơn (Single Text Analysis)
            if path == "/api/analyze":
                text = payload.get("text", "").strip()
                if not text:
                    self.send_json({"error": "Vui lòng nhập nội dung đánh giá."}, 400)
                    return

                clean_t = preprocess_text(text)
                vec = vectorizer.transform([clean_t])
                pred_label = model.predict(vec)[0]
                proba = float(np.max(model.predict_proba(vec))) * 100

                sentiment_text = sentiment_map_vi.get(pred_label, "Tích cực")
                if language == "en":
                    sentiment_text = pred_label

                self.send_json({
                    "sentiment": sentiment_text,
                    "label": pred_label,
                    "color": color_map.get(pred_label, "#159b68"),
                    "confidence": round(max(70.0, min(98.0, proba)), 1),
                    "word_count": len(text.split()),
                    "language": language,
                    "message": "Phân tích tự động bằng mô hình Machine Learning (Logistic Regression & TF-IDF)."
                })
                return

            # Xử lý Phân tích tệp/hàng loạt (Batch Analysis)
            texts = payload.get("texts", [])
            batch_results = []
            for t in texts:
                t_str = str(t).strip()
                clean_t = preprocess_text(t_str)
                vec = vectorizer.transform([clean_t])
                pred_label = model.predict(vec)[0]
                proba = float(np.max(model.predict_proba(vec))) * 100
                sentiment_text = sentiment_map_vi.get(pred_label, "Tích cực")

                batch_results.append({
                    "text": t_str,
                    "sentiment": sentiment_text,
                    "label": pred_label,
                    "color": color_map.get(pred_label, "#159b68"),
                    "confidence": round(max(70.0, min(98.0, proba)), 1),
                    "word_count": len(t_str.split()),
                    "language": language
                })
            self.send_json(batch_results)

        except Exception as e:
            self.send_json({"error": str(e)}, 400)

    def serve_file(self, file_path, content_type):
        try:
            data = file_path.read_bytes()
        except FileNotFoundError:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, payload, status=200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format_string, *args):
        # Tắt bớt log rác để màn hình terminal luôn sạch sẽ, chuyên nghiệp
        pass


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), DashboardHandler)
    print("\n----------------------------------------------------------")
    print("  HỆ THỐNG SENTIMENTAI DÀNH CHO BÁO CÁO TIỂU LUẬN DƯỢC KÍCH HOẠT")
    print("  Địa chỉ ứng dụng Web: http://127.0.0.1:8000")
    print("----------------------------------------------------------\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng máy chủ thành công.")
        server.server_close()