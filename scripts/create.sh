#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STARTER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES_DIR="$STARTER_DIR/templates"

TEMPLATE_FILES=(
    "next.config.ts"
    "postcss.config.mjs"
    "tsconfig.json"
    "vitest.config.ts"
    "apphosting.yaml"
    "firebase.json"
    "firestore.rules"
    "firestore.indexes.json"
    ".firebaserc.template"
    ".env.example"
    "src/lib/firebase.ts"
    "src/lib/firebase-admin.ts"
    "src/lib/firebase-storage.ts"
    "src/lib/r2.ts"
    "src/lib/stripe.ts"
    "src/lib/utils.ts"
    "src/lib/demo-config.ts"
    "src/lib/admin.ts"
    "src/lib/api/auth.ts"
    "src/lib/api/admin-auth.ts"
    "src/lib/api/responses.ts"
    "src/hooks/useAuth.tsx"
    "src/components/auth/AuthGuard.tsx"
    "src/components/providers/Providers.tsx"
    "src/app/layout.tsx"
    "src/app/page.tsx"
    "src/app/error.tsx"
    "src/app/not-found.tsx"
    "src/app/(public)/layout.tsx"
    "src/app/(public)/login/page.tsx"
    "src/app/(public)/signup/page.tsx"
    "src/app/(auth)/layout.tsx"
    "src/app/(auth)/dashboard/page.tsx"
    "src/app/api/stripe/webhook/route.ts"
    "src/app/api/stripe/checkout/route.ts"
    "src/app/api/stripe/portal/route.ts"
    "src/__tests__/setup.ts"
    "src/__tests__/smoke.test.ts"
)

SHADCN_COMPONENTS=(
    button card table badge tabs
    separator skeleton dialog drawer input label
)

resolve_absolute_path() {
    case "$1" in
        /*) echo "$1" ;;
        *)  echo "$(pwd)/$1" ;;
    esac
}

APP_PATH="$(resolve_absolute_path "${1:-my-app}")"

if [ -d "$APP_PATH" ]; then
    echo "Error: Directory '$APP_PATH' already exists"
    exit 1
fi

scaffold_next_app() {
    local app_dir="$(dirname "$APP_PATH")"
    local app_base="$(basename "$APP_PATH")"
    (cd "$app_dir" && pnpm create next-app@latest "$app_base" \
        --typescript \
        --tailwind \
        --no-eslint \
        --app \
        --src-dir \
        --import-alias "@/*" \
        --use-pnpm \
        --no-turbopack \
        --yes)
}

install_dependencies() {
    cp "$STARTER_DIR/package.json" "$APP_PATH/package.json"
    cd "$APP_PATH"
    # The copied package.json carries the starter's name; rewrite to the new project's basename.
    node -e "const fs=require('fs'),p='package.json',j=JSON.parse(fs.readFileSync(p));j.name=process.argv[1];fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')" "$(basename "$APP_PATH")"
    pnpm install
}

copy_templates() {
    for file in "${TEMPLATE_FILES[@]}"; do
        mkdir -p "$(dirname "$file")"
        cp "$TEMPLATES_DIR/$file" "$file"
    done
    # .firebaserc.template -> .firebaserc (placeholder, user edits project ID)
    [ -f .firebaserc.template ] && mv .firebaserc.template .firebaserc
}

configure_tooling() {
    cp "$STARTER_DIR/biome.json" biome.json
    copy_templates
    pnpx shadcn@latest init -d -y
    pnpx shadcn@latest add -y --overwrite "${SHADCN_COMPONENTS[@]}"
    # shadcn-generated components don't match Biome's style — fix them.
    pnpm format >/dev/null 2>&1 || true
}

setup_links() {
    mkdir -p "$APP_PATH/scripts"
    cp "$SCRIPT_DIR/setup.sh" "$APP_PATH/scripts/setup.sh"
    chmod +x "$APP_PATH/scripts/setup.sh"
    "$APP_PATH/scripts/setup.sh"
}

init_git() {
    rm -rf .git
    git init
    git add -A
    git commit -m "feat: Initial app from firebase-nextjs-starter"
}

scaffold_next_app
install_dependencies
configure_tooling
setup_links
init_git

echo "Done! Next steps:"
echo "  cd $APP_PATH"
echo "  cp .env.example .env.local  # then fill in the values"
echo "  # edit .firebaserc to set your Firebase project ID"
echo "  pnpm dev"
echo ""
echo "Claude Code skills:"
echo "  /import      # replay an upstream repo into this stack"
echo "  /readme      # generate README.md"
echo "  /update-tech # record technology changes"
