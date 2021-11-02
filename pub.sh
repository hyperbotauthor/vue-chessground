set -e

yarn build

bash auth.sh
node bump.js
npm publish --access=public

bash rebase.sh