import os
import requests
from collections import Counter

TOKEN = os.getenv("GITHUB_TOKEN")
USERNAME = "intensealchemist"

headers = {"Authorization": f"token {TOKEN}"}
repos_url = f"https://api.github.com/users/{USERNAME}/repos?per_page=100&type=all"
repos = []
page = 1

# Fetch all repos (public + private)
while True:
    resp = requests.get(repos_url + f"&page={page}", headers=headers)
    data = resp.json()
    if not data:
        break
    repos.extend(data)
    page += 1

lang_counter = Counter()
for repo in repos:
    # skip forks if you want
    languages_url = repo["languages_url"]
    langs = requests.get(languages_url, headers=headers).json()
    lang_counter.update(langs)

# Markdown output
md = "| Language | Lines of code |\n|---|---|\n"
for lang, count in lang_counter.most_common(8):
    md += f"| {lang} | {count} |\n"

print(md)
