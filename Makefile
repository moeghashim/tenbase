.PHONY: install dev build preview test e2e lint format typecheck check ship clean

install:
	npm ci && echo "PASS install" || (echo "FAIL install"; exit 1)

dev:
	npm run dev

build:
	npm run build && echo "PASS build" || (echo "FAIL build"; exit 1)

preview:
	npm run preview

test:
	npm run test -- --run && echo "PASS test" || (echo "FAIL test"; exit 1)

e2e:
	npm run e2e && echo "PASS e2e" || (echo "FAIL e2e"; exit 1)

lint:
	npm run lint && echo "PASS lint" || (echo "FAIL lint"; exit 1)

format:
	npm run format && echo "PASS format" || (echo "FAIL format"; exit 1)

typecheck:
	npm run typecheck && echo "PASS typecheck" || (echo "FAIL typecheck"; exit 1)

check: typecheck lint test
	@echo "PASS all checks green"

ship: check build e2e
	@echo "PASS shippable"

clean:
	rm -rf node_modules dist .vite playwright-report test-results && echo "PASS clean"
