import os
import requests

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
USERNAME = "intensealchemist"
API_URL = f"https://api.github.com/users/{USERNAME}/repos?type=private"

headers = {
    "Authorization": f"token {GITHUB_TOKEN}"
}

response = requests.get(API_URL, headers=headers)
repos = response.json()

stats = []
for repo in repos:
    stats.append(f"- **{repo['name']}**: ⭐ {repo['stargazers_count']} | 🍴 {repo['forks_count']} | 📝 {repo['language']}")

with open("README.md", "r") as f:
    readme = f.read()

new_section = "## Private Repository Stats\n" + "\n".join(stats)

# Replace or append stats section in README
if "## Private Repository Stats" in readme:
    readme = readme.split("## Private Repository Stats")[0] + new_section
else:
    readme += "\n\n" + new_section

with open("README.md", "w") as f:
    f.write(readme)
