#!/usr/bin/env bash

set -Eeuo pipefail

SKIP_PULL=false
SKIP_DB=false
SKIP_TESTS=false
SKIP_BUILD=false
ALLOW_PRODUCTION_DB_PUSH=false

for arg in "$@"; do
  case "$arg" in
    --skip-pull)
      SKIP_PULL=true
      ;;
    --skip-db)
      SKIP_DB=true
      ;;
    --skip-tests)
      SKIP_TESTS=true
      ;;
    --skip-build)
      SKIP_BUILD=true
      ;;
    --allow-production-db-push)
      ALLOW_PRODUCTION_DB_PUSH=true
      ;;
    --help|-h)
      cat <<'EOF'
MoneyOS update script

Usage:
  run-moneyos-update [options]

Options:
  --skip-pull                  Do not fetch or pull Git changes
  --skip-db                    Do not run Prisma database commands
  --skip-tests                 Do not run tests
  --skip-build                 Do not run the production build
  --allow-production-db-push  Allow Prisma db push when production is detected
  --help                       Show this help message
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      exit 1
      ;;
  esac
done

step() {
  echo
  echo "=================================================="
  echo "$1"
  echo "=================================================="
}

fail() {
  echo
  echo "MONEYOS UPDATE FAILED"
  echo "$1"
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

package_script_exists() {
  local script_name="$1"

  node -e "
    const pkg = require('./package.json');
    process.exit(pkg.scripts && pkg.scripts['$script_name'] ? 0 : 1);
  " >/dev/null 2>&1
}

run_package_script() {
  local script_name="$1"

  case "$PACKAGE_MANAGER" in
    pnpm)
      pnpm run "$script_name"
      ;;
    yarn)
      yarn "$script_name"
      ;;
    npm)
      npm run "$script_name"
      ;;
  esac
}

run_prisma() {
  case "$PACKAGE_MANAGER" in
    pnpm)
      pnpm exec prisma "$@"
      ;;
    yarn)
      yarn prisma "$@"
      ;;
    npm)
      npx prisma "$@"
      ;;
  esac
}

trap 'fail "The script stopped on line $LINENO while running: $BASH_COMMAND"' ERR

step "MoneyOS Update and Validation"

[[ -d ".git" ]] || fail "No .git directory found. Run this from the MoneyOS repository root."
[[ -f "package.json" ]] || fail "No package.json found. Run this from the MoneyOS repository root."

command_exists git || fail "Git is not installed."
command_exists node || fail "Node.js is not installed."

if [[ -f "pnpm-lock.yaml" ]]; then
  PACKAGE_MANAGER="pnpm"
elif [[ -f "yarn.lock" ]]; then
  PACKAGE_MANAGER="yarn"
else
  PACKAGE_MANAGER="npm"
fi

command_exists "$PACKAGE_MANAGER" || fail "$PACKAGE_MANAGER is required but was not found."

CURRENT_BRANCH="$(git branch --show-current)"

[[ -n "$CURRENT_BRANCH" ]] || fail "Unable to determine the current Git branch."

echo "Repository: $(pwd)"
echo "Branch: $CURRENT_BRANCH"
echo "Package manager: $PACKAGE_MANAGER"

if [[ -n "$(git status --porcelain)" ]]; then
  echo
  echo "Uncommitted changes detected:"
  git status --short
  echo
  fail "Commit or stash your changes before running the update script."
fi

if [[ "$SKIP_PULL" == false ]]; then
  step "Fetching remote updates"
  git fetch --prune

  step "Updating branch: $CURRENT_BRANCH"
  git pull --ff-only origin "$CURRENT_BRANCH"
else
  echo "Skipping Git pull."
fi

step "Installing dependencies"

case "$PACKAGE_MANAGER" in
  pnpm)
    pnpm install --frozen-lockfile
    ;;
  yarn)
    yarn install --frozen-lockfile
    ;;
  npm)
    if [[ -f "package-lock.json" ]]; then
      npm ci
    else
      npm install
    fi
    ;;
esac

PRISMA_SCHEMA=""

if [[ -f "prisma/schema.prisma" ]]; then
  PRISMA_SCHEMA="prisma/schema.prisma"
else
  PRISMA_SCHEMA="$(find . -path '*/node_modules' -prune -o -name schema.prisma -print -quit)"
fi

if [[ -n "$PRISMA_SCHEMA" ]]; then
  step "Generating Prisma client"
  run_prisma generate

  if [[ "$SKIP_DB" == false ]]; then
    DATABASE_VALUE="${DATABASE_URL:-}"
    NODE_ENV_VALUE="${NODE_ENV:-}"

    if [[ "$NODE_ENV_VALUE" == "production" || "$DATABASE_VALUE" =~ prod|production ]]; then
      if [[ "$ALLOW_PRODUCTION_DB_PUSH" == false ]]; then
        fail "Possible production database detected. Use reviewed migrations, or pass --allow-production-db-push only after verifying the database and backup."
      fi
    fi

    step "Synchronizing Prisma database schema"
    run_prisma db push
  else
    echo "Skipping database synchronization."
  fi
else
  echo "No Prisma schema found. Skipping Prisma commands."
fi

if package_script_exists "typecheck"; then
  step "Running TypeScript type-check"
  run_package_script "typecheck"
elif package_script_exists "type-check"; then
  step "Running TypeScript type-check"
  run_package_script "type-check"
else
  echo "No typecheck script found. Skipping type-check."
fi

if package_script_exists "lint"; then
  step "Running lint"
  run_package_script "lint"
else
  echo "No lint script found. Skipping lint."
fi

if [[ "$SKIP_TESTS" == false ]]; then
  if package_script_exists "test"; then
    step "Running tests"

    case "$PACKAGE_MANAGER" in
      pnpm)
        pnpm test -- --run
        ;;
      yarn)
        yarn test --runInBand
        ;;
      npm)
        npm test -- --run
        ;;
    esac
  else
    echo "No test script found. Skipping tests."
  fi
else
  echo "Skipping tests."
fi

if [[ "$SKIP_BUILD" == false ]]; then
  if package_script_exists "build"; then
    step "Running production build"
    run_package_script "build"
  else
    echo "No build script found. Skipping build."
  fi
else
  echo "Skipping production build."
fi

step "MoneyOS Update Completed Successfully"

echo "Branch updated: $CURRENT_BRANCH"
echo "Dependencies installed"
echo "Prisma client generated when available"
echo "Database synchronized when enabled"
echo "Validation completed"
