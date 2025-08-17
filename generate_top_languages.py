import os
import requests
from collections import Counter

TOKEN = os.getenv("TOP_LANGS_TOKEN")
USERNAME = "intensealchemist"

headers = {"Authorization": f"token {TOKEN}"}
repos = []
page = 1

while True:
    url = f"https://api.github.com/users/{USERNAME}/repos?per_page=100&type=all&page={page}"
    r = requests.get(url, headers=headers)
    data = r.json()
    if not data or "message" in data:
        break
    repos.extend(data)
    page += 1

lang_counter = Counter()
for repo in repos:
    if repo.get("fork"):
        continue  # Skip forks
    langs_url = repo["languages_url"]
    langs = requests.get(langs_url, headers=headers).json()
    lang_counter.update(langs)

md = "| Language | Lines of code |\n|---|---|\n"
for lang, count in lang_counter.most_common(8):
    md += f"| {lang} | {count} |\n"

with open("top_langs.md", "w") as f:
    f.write(md)
