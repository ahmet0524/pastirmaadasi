import os

# Çıktı dosyası adı
output_file = "project_export.txt"

# Projenin kök dizini (bu scripti projenin kökünde çalıştırırsan "." bırakabilirsin)
root_dir = "."

# Hangi dosya tiplerini almak istediğini belirt (.py, .html, .css, .js, .md vs.)
extensions = (".py", ".html", ".css", ".js", ".md", ".json", ".txt")

with open(output_file, "w", encoding="utf-8") as out:
    for foldername, subfolders, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(extensions):
                filepath = os.path.join(foldername, filename)
                out.write("\n" + "="*80 + "\n")
                out.write(f"📄 {filepath}\n")
                out.write("="*80 + "\n\n")
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        out.write(f.read())
                except Exception as e:
                    out.write(f"[Dosya okunamadı: {e}]\n")
