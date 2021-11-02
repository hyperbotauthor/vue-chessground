git config --global user.email "hyperbotauthor@gmail.com"
git config --global user.name "hyperbotauthor"
rm -rf .git
git init
git remote add origin https://hyperbotauthor:$GIT_TOKEN@github.com/hyperbotauthor/vue-chessground.git
git checkout -b main
git add .
git commit -m "Initial commit"
git push --set-upstream --force origin main
