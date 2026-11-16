"""Skill: OpenAPI Inspector.
Inspects FastAPI runtime openapi schema and contrasts it with docs/openapi.yaml contract.
"""
import sys
from pathlib import Path
from typing import Any

# Ensure apps/backend is in sys.path
backend_root = Path(__file__).resolve().parents[2]
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import yaml
from app.main import create_app


def find_repo_root() -> Path:
    """Find repository root by looking for docs/openapi.yaml."""
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / "docs" / "openapi.yaml").exists():
            return current
        current = current.parent
    # Fallback default
    return Path(__file__).resolve().parents[3]


def load_contract_spec(contract_path: Path | None = None) -> dict[str, Any]:
    """Load docs/openapi.yaml contract specification."""
    if contract_path is None:
        repo_root = find_repo_root()
        contract_path = repo_root / "docs" / "openapi.yaml"
    if not contract_path.exists():
        raise FileNotFoundError(f"OpenAPI contract not found at: {contract_path}")
    with open(contract_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_runtime_spec() -> dict[str, Any]:
    """Generate runtime OpenAPI schema from FastAPI application."""
    app = create_app()
    return app.openapi()


def inspect_endpoints() -> dict[str, Any]:
    """Compare runtime endpoints against docs/openapi.yaml contract."""
    contract = load_contract_spec()
    runtime = load_runtime_spec()

    contract_paths = contract.get("paths", {})
    runtime_paths = runtime.get("paths", {})

    contract_routes: set[tuple[str, str]] = set()
    for path, methods in contract_paths.items():
        for method in methods:
            if method.lower() in ("get", "post", "put", "delete", "patch"):
                contract_routes.add((path, method.upper()))

    runtime_routes: set[tuple[str, str]] = set()
    for path, methods in runtime_paths.items():
        for method in methods:
            if method.lower() in ("get", "post", "put", "delete", "patch"):
                runtime_routes.add((path, method.upper()))

    common_routes = contract_routes.intersection(runtime_routes)
    missing_in_runtime = contract_routes - runtime_routes
    undocumented_in_contract = runtime_routes - contract_routes

    # Collect parameter and response details for each runtime route
    route_details = []
    for path, method in sorted(runtime_routes):
        spec = runtime_paths.get(path, {}).get(method.lower(), {})
        contract_spec = contract_paths.get(path, {}).get(method.lower(), {})
        
        parameters = spec.get("parameters", [])
        request_body = spec.get("requestBody", {})
        responses = spec.get("responses", {})

        route_details.append({
            "path": path,
            "method": method,
            "summary": spec.get("summary", ""),
            "operation_id": spec.get("operationId", ""),
            "parameters": parameters,
            "has_body": bool(request_body),
            "expected_responses": list(responses.keys()),
            "contract_matched": (path, method) in common_routes,
        })

    return {
        "total_contract_routes": len(contract_routes),
        "total_runtime_routes": len(runtime_routes),
        "matching_routes": len(common_routes),
        "missing_in_runtime": [f"{m} {p}" for p, m in sorted(missing_in_runtime)],
        "undocumented_in_contract": [f"{m} {p}" for p, m in sorted(undocumented_in_contract)],
        "routes": route_details,
    }


if __name__ == "__main__":
    report = inspect_endpoints()
    print("=== OpenAPI Contract vs Runtime Inspection ===")
    print(f"Contract routes: {report['total_contract_routes']}")
    print(f"Runtime routes:  {report['total_runtime_routes']}")
    print(f"Matching routes: {report['matching_routes']}")
    if report["missing_in_runtime"]:
        print(f"Missing in runtime ({len(report['missing_in_runtime'])}): {report['missing_in_runtime']}")
    if report["undocumented_in_contract"]:
        print(f"Undocumented in contract ({len(report['undocumented_in_contract'])}): {report['undocumented_in_contract']}")
    print(f"Inspected {len(report['routes'])} routes successfully.")
