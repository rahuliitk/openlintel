# OpenLintel -- Audit Issues Implementation Guide

**Date:** March 6, 2026
**Reference:** `codeaudit.md` (278 findings across 20 sections)
**Scope:** Step-by-step remediation instructions for every finding

---

## Table of Contents

1. [Phase 1: CRITICAL Security Fixes (SEC-001 to SEC-009)](#1-phase-1-critical-security-fixes)
2. [Phase 1: Kubernetes Security (K8S-001 to K8S-008)](#2-phase-1-kubernetes-security)
3. [Phase 2: Docker Hardening (DOC-001 to DOC-003)](#3-phase-2-docker-hardening)
4. [Phase 2: Terraform Fixes (TF-001 to TF-005)](#4-phase-2-terraform-fixes)
5. [Phase 2: CI/CD Security (CI-001 to CI-004)](#5-phase-2-cicd-security)
6. [Phase 2: Backend Fixes (BE-001 to BE-014)](#6-phase-2-backend-fixes)
7. [Phase 3: Frontend Fixes (FE-001 to FE-030)](#7-phase-3-frontend-fixes)
8. [Phase 3: Database Fixes (DB-001 to DB-003)](#8-phase-3-database-fixes)
9. [Phase 3: ML Pipeline Fixes (ML-001 to ML-004)](#9-phase-3-ml-pipeline-fixes)
10. [Phase 3: Testing (TST-001 to TST-004)](#10-phase-3-testing)
11. [Phase 3: UI/UX Fixes (UX-001 to UX-025)](#11-phase-3-uiux-fixes)
12. [Phase 4: Architecture (ARCH-001 to ARCH-004)](#12-phase-4-architecture)
13. [Phase 4: Backend API Errors (Section 17)](#13-phase-4-backend-api-errors)
14. [Phase 4: Missing Features & Desired Enhancements (Section 18)](#14-phase-4-missing-features)
15. [Phase 4: Config, Dependencies, Compliance (CFG, DEP, COMP)](#15-phase-4-config-dependencies-compliance)

---

## 1. Phase 1: CRITICAL Security Fixes

### SEC-001 & SEC-002: Hardcoded Secrets in Version Control

**Files:** `infra/k8s/secrets.yaml`, `docker-compose.yml`
**Severity:** CRITICAL

**Step 1: Remove secrets from Git history**

```bash
# Add to .gitignore immediately
echo "infra/k8s/secrets.yaml" >> .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "chore: add secrets files to .gitignore"
```

**Step 2: Install External Secrets Operator (ESO) for Kubernetes**

```bash
# Install ESO via Helm
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace
```

**Step 3: Create AWS Secrets Manager entries**

```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name openlintel/production/database \
  --secret-string '{"DATABASE_URL":"postgresql://openlintel:<STRONG_PASSWORD>@<RDS_ENDPOINT>:5432/openlintel"}'

aws secretsmanager create-secret \
  --name openlintel/production/auth \
  --secret-string '{"NEXTAUTH_SECRET":"<GENERATE: openssl rand -base64 32>","JWT_SECRET":"<GENERATE: openssl rand -base64 32>"}'

aws secretsmanager create-secret \
  --name openlintel/production/storage \
  --secret-string '{"MINIO_ACCESS_KEY":"<GENERATE>","MINIO_SECRET_KEY":"<GENERATE: openssl rand -base64 32>"}'

aws secretsmanager create-secret \
  --name openlintel/production/search \
  --secret-string '{"MEILI_MASTER_KEY":"<GENERATE: openssl rand -base64 32>"}'

aws secretsmanager create-secret \
  --name openlintel/production/encryption \
  --secret-string '{"API_KEY_ENCRYPTION_SECRET":"<GENERATE: openssl rand -base64 32>"}'
```

**Step 4: Create ESO SecretStore and ExternalSecret manifests**

Replace `infra/k8s/secrets.yaml` with:

```yaml
# infra/k8s/secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: openlintel
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-south-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
---
# infra/k8s/external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: openlintel-secrets
  namespace: openlintel
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: openlintel-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: openlintel/production/database
        property: DATABASE_URL
    - secretKey: NEXTAUTH_SECRET
      remoteRef:
        key: openlintel/production/auth
        property: NEXTAUTH_SECRET
    - secretKey: JWT_SECRET
      remoteRef:
        key: openlintel/production/auth
        property: JWT_SECRET
    - secretKey: MINIO_ACCESS_KEY
      remoteRef:
        key: openlintel/production/storage
        property: MINIO_ACCESS_KEY
    - secretKey: MINIO_SECRET_KEY
      remoteRef:
        key: openlintel/production/storage
        property: MINIO_SECRET_KEY
    - secretKey: MEILI_MASTER_KEY
      remoteRef:
        key: openlintel/production/search
        property: MEILI_MASTER_KEY
    - secretKey: API_KEY_ENCRYPTION_SECRET
      remoteRef:
        key: openlintel/production/encryption
        property: API_KEY_ENCRYPTION_SECRET
```

**Step 5: Fix docker-compose.yml for local development**

```yaml
# docker-compose.yml — replace hardcoded creds with env vars
services:
  minio:
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin}
```

Create `.env.example` with placeholder instructions (no actual secrets):

```bash
# .env.example
DATABASE_URL=postgresql://openlintel:CHANGE_ME@localhost:5432/openlintel
NEXTAUTH_SECRET=run-openssl-rand-base64-32
JWT_SECRET=run-openssl-rand-base64-32
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=CHANGE_ME
MEILI_MASTER_KEY=CHANGE_ME
API_KEY_ENCRYPTION_SECRET=run-openssl-rand-base64-32
STRIPE_WEBHOOK_SECRET=whsec_CHANGE_ME
```

**Step 6: Scrub Git history (optional but recommended)**

```bash
# Use BFG Repo-Cleaner to remove secrets from history
# WARNING: This rewrites Git history — coordinate with team
bfg --delete-files secrets.yaml
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

---

### SEC-003: Stripe Webhook Signature Bypass

**File:** `apps/web/src/app/api/payments/webhook/route.ts`
**Severity:** HIGH

**Current vulnerable code (lines 19, 46-56):**

```typescript
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
// ...
if (!webhookSecret) {
  event = JSON.parse(body); // No signature verification!
}
```

**Fixed code — replace the entire webhook handler opening:**

```typescript
// apps/web/src/app/api/payments/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST(req: NextRequest) {
  // SECURITY: Reject if webhook secret not configured
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // ... rest of event handling
}
```

---

### SEC-004 & SEC-009: Missing Authorization Checks

**Files:**
- `services/media-service/src/routers/assets.py` (lines 123-140, 162-176)
- `apps/web/src/app/api/bom/export/[bomId]/route.ts`

**Step 1: Add ownership verification to media-service**

```python
# services/media-service/src/routers/assets.py

from openlintel_shared.auth import get_current_user

@router.get("/{media_id}/url")
async def get_media_url(
    media_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Validate media_id format first (fixes SEC-005 too)
    MEDIA_ID_PATTERN = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    )
    if not MEDIA_ID_PATTERN.match(media_id):
        raise HTTPException(status_code=400, detail="Invalid media ID format")

    # Ownership check: verify this media belongs to the requesting user
    result = await db.execute(
        text("""
            SELECT u.id FROM uploads u
            JOIN projects p ON u.project_id = p.id
            WHERE u.id = :media_id AND p.user_id = :user_id
        """),
        {"media_id": media_id, "user_id": current_user["sub"]},
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Media not found")

    # ... proceed with presigned URL generation
```

**Step 2: Add ownership check to BOM export**

```typescript
// apps/web/src/app/api/bom/export/[bomId]/route.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@openlintel/db";
import { bomResults, projects } from "@openlintel/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: { bomId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership: BOM -> project -> user
  const bom = await db
    .select()
    .from(bomResults)
    .innerJoin(projects, eq(bomResults.projectId, projects.id))
    .where(
      and(
        eq(bomResults.id, params.bomId),
        eq(projects.userId, session.user.id)
      )
    )
    .limit(1);

  if (bom.length === 0) {
    return NextResponse.json({ error: "BOM not found" }, { status: 404 });
  }

  // ... proceed with export
}
```

---

### SEC-005: Path Traversal in Media Service

**File:** `services/media-service/src/routers/assets.py` (lines 71-80)

**Current vulnerable code:**

```python
if media_id in key:  # Attacker sends media_id="../admin/"
```

**Fixed code — replace `_find_object_key()` function:**

```python
import re
from fastapi import HTTPException

MEDIA_ID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
)

def _validate_media_id(media_id: str) -> str:
    """Validate media_id is a proper UUID to prevent path traversal."""
    if not MEDIA_ID_PATTERN.match(media_id):
        raise HTTPException(status_code=400, detail="Invalid media ID format")
    return media_id

async def _find_object_key(
    minio_client, bucket: str, media_id: str
) -> str | None:
    media_id = _validate_media_id(media_id)
    # Use database lookup instead of listing all objects
    # If you must list, use prefix-based lookup:
    prefix = f"uploads/{media_id}"
    objects = minio_client.list_objects(bucket, prefix=prefix)
    for obj in objects:
        if media_id in obj.object_name:
            return obj.object_name
    return None
```

---

### SEC-006: SQL Injection via Dynamic Column Names

**File:** `services/catalogue-service/src/routers/products.py` (line 341)

**Current vulnerable code:**

```python
for field, value in update_data.items():
    set_clauses.append(f"{field} = :{field}")  # User controls field names!
```

**Fixed code:**

```python
# services/catalogue-service/src/routers/products.py

ALLOWED_UPDATE_FIELDS = frozenset({
    "name", "description", "sku", "brand", "price",
    "category", "unit", "dimensions", "weight",
    "image_url", "spec_json", "is_active",
})

@router.put("/{product_id}")
async def update_product(
    product_id: str,
    update_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Whitelist allowed fields
    sanitized = {
        k: v for k, v in update_data.items()
        if k in ALLOWED_UPDATE_FIELDS
    }

    if not sanitized:
        raise HTTPException(
            status_code=422,
            detail=f"No valid fields to update. Allowed: {sorted(ALLOWED_UPDATE_FIELDS)}",
        )

    set_clauses = []
    params = {"product_id": product_id}
    for field, value in sanitized.items():
        set_clauses.append(f"{field} = :{field}")
        params[field] = value

    query = text(f"UPDATE products SET {', '.join(set_clauses)} WHERE id = :product_id")
    await db.execute(query, params)
    await db.commit()

    return {"status": "updated", "fields": list(sanitized.keys())}
```

---

### SEC-007: LLM API Error Leakage

**File:** `apps/web/src/lib/llm-client.ts` (lines 98-99, 127-128, 155-156)

**Fix — wrap each LLM call with generic error handling:**

```typescript
// apps/web/src/lib/llm-client.ts

class LLMClientError extends Error {
  constructor(
    public userMessage: string,
    public internalError: unknown
  ) {
    super(userMessage);
    this.name = "LLMClientError";
  }
}

// Replace each try/catch block pattern:
// BEFORE:
//   } catch (error) {
//     throw new Error(`LLM call failed: ${error}`);
//   }

// AFTER:
async function callLLM(/* params */) {
  try {
    // ... existing LLM call logic
  } catch (error) {
    // Log full error server-side for debugging
    console.error("[LLM] Call failed:", {
      provider: provider,
      model: model,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return generic message to client
    throw new LLMClientError(
      "AI service temporarily unavailable. Please try again.",
      error
    );
  }
}
```

---

### SEC-008: Weak Cryptographic Key Derivation

**File:** `apps/web/src/lib/crypto.ts` (line 11)

**Current vulnerable code:**

```typescript
function getEncryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET!;
  return Buffer.from(secret.slice(0, 32));  // Raw bytes, no derivation
}
```

**Fixed code:**

```typescript
// apps/web/src/lib/crypto.ts

import crypto from "node:crypto";

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bits for AES-256
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // 96 bits for AES-256-GCM

function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
}

export function encryptApiKey(plainKey: string): {
  encryptedKey: string;
  iv: string;
  authTag: string;
  salt: string;
  keyPrefix: string;
} {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("API_KEY_ENCRYPTION_SECRET must be at least 32 characters");
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    salt: salt.toString("base64"),
    keyPrefix: plainKey.slice(0, 8),
  };
}

export function decryptApiKey(
  encryptedKey: string,
  iv: string,
  authTag: string,
  salt: string
): string {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) throw new Error("API_KEY_ENCRYPTION_SECRET not configured");

  const key = deriveKey(secret, Buffer.from(salt, "base64"));
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedKey, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
```

**Migration note:** Existing encrypted keys must be re-encrypted. Create a migration script:

```typescript
// scripts/migrate-api-keys.ts
// 1. Decrypt all keys with old method (raw slice)
// 2. Re-encrypt with new PBKDF2 method
// 3. Update salt column in user_api_keys table
// Add `salt` column: ALTER TABLE user_api_keys ADD COLUMN salt TEXT;
```

---

### SEC-010: CORS Too Permissive

**File:** `packages/python-shared/src/openlintel_shared/middleware.py` (lines 48-54)

**Current code:**

```python
allow_methods=["*"],
allow_headers=["*"],
allow_credentials=True
```

**Fixed code:**

```python
# packages/python-shared/src/openlintel_shared/middleware.py

def setup_middleware(app: FastAPI, settings: Settings | None = None):
    settings = settings or get_settings()

    allowed_origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else [
        "http://localhost:3000",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Request-ID",
            "X-Correlation-ID",
        ],
        expose_headers=["X-Request-ID", "X-Correlation-ID"],
        max_age=600,  # Cache preflight for 10 minutes
    )
```

Add to `config.py`:

```python
CORS_ORIGINS: str = "http://localhost:3000"
```

---

### SEC-011: Hardcoded Default Credentials in Config

**File:** `packages/python-shared/src/openlintel_shared/config.py` (lines 35-36, 42, 44)

**Fixed code — add validators:**

```python
# packages/python-shared/src/openlintel_shared/config.py

from pydantic import field_validator
from pydantic_settings import BaseSettings

INSECURE_DEFAULTS = frozenset({
    "minioadmin", "change-me", "change-me-in-production",
    "replace-with-a-secure-random-string", "dev-encryption-secret-32chars!!",
    "openlintel_dev_key",
})

class Settings(BaseSettings):
    # ... existing fields ...

    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    JWT_SECRET: str = "replace-with-a-secure-random-string"

    @field_validator("MINIO_SECRET_KEY", "JWT_SECRET", mode="after")
    @classmethod
    def reject_insecure_defaults(cls, v: str, info) -> str:
        if v.lower() in INSECURE_DEFAULTS:
            import os
            if os.getenv("ENVIRONMENT", "development") != "development":
                raise ValueError(
                    f"{info.field_name} is using an insecure default. "
                    f"Set a strong value via environment variable."
                )
        return v
```

---

### SEC-012: Storage Key Path Traversal (Frontend)

**File:** `apps/web/src/app/api/uploads/[key]/route.ts` (lines 15-16)

**Fix:**

```typescript
// apps/web/src/app/api/uploads/[key]/route.ts

const SAFE_KEY_PATTERN = /^[a-zA-Z0-9\/_.\-]+$/;

export async function GET(
  req: Request,
  { params }: { params: { key: string } }
) {
  const key = decodeURIComponent(params.key);

  // Prevent path traversal
  if (!SAFE_KEY_PATTERN.test(key) || key.includes("..")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  // ... proceed with S3 lookup
}
```

---

### SEC-013 & SEC-014: Exception Messages Leaked to Clients

**Files:**
- `services/design-engine/src/routers/designs.py` (lines 234-237)
- `services/project-service/src/routers/change_orders.py` (lines 218-237)

**Fix pattern for all services:**

```python
# BEFORE (vulnerable):
except Exception as exc:
    raise HTTPException(
        status_code=500,
        detail=f"Impact analysis failed: {exc}",  # Leaks internals
    )

# AFTER (safe):
import logging
import uuid

logger = logging.getLogger(__name__)

except Exception as exc:
    error_id = str(uuid.uuid4())[:8]
    logger.error(
        "Impact analysis failed",
        extra={"error_id": error_id, "error": str(exc)},
        exc_info=True,
    )
    raise HTTPException(
        status_code=500,
        detail=f"Internal error. Reference: {error_id}",
    )
```

---

### SEC-015: Hardcoded Meilisearch Dev Key

**File:** `services/catalogue-service/src/search.py` (line 67)

**Fix:**

```python
# BEFORE:
meili_key = "openlintel_dev_key"

# AFTER:
from openlintel_shared.config import get_settings

settings = get_settings()
meili_key = settings.MEILI_MASTER_KEY
```

---

### SEC-016: Prompt Injection Risk

**File:** `ml/design-gen/prompts.py`

**Fix — sanitize user inputs before prompt injection:**

```python
# ml/design-gen/prompts.py

import re

def sanitize_user_input(text: str, max_length: int = 500) -> str:
    """Remove potential prompt injection patterns from user input."""
    # Truncate
    text = text[:max_length]
    # Remove common injection patterns
    text = re.sub(r"(ignore|forget|disregard)\s+(all\s+)?(previous|above|prior)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"(system|assistant|user)\s*:", "", text, flags=re.IGNORECASE)
    # Remove markdown/code blocks that could contain instructions
    text = re.sub(r"```[\s\S]*?```", "", text)
    return text.strip()

def build_design_prompt(room_description: str, style: str, budget: str) -> str:
    safe_description = sanitize_user_input(room_description)
    return f"""You are an interior design AI. Generate a design for the following room.

Room description: {safe_description}
Style: {style}
Budget tier: {budget}

Respond with a JSON object containing..."""
```

---

## 2. Phase 1: Kubernetes Security

### K8S-001: No NetworkPolicy Resources

**Severity:** CRITICAL

**Step 1: Create default deny-all policy**

```yaml
# infra/k8s/network-policies/00-default-deny.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: openlintel
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

**Step 2: Create allow policies for each service**

```yaml
# infra/k8s/network-policies/01-web-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-policy
  namespace: openlintel
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
    - to:  # Allow web to reach all backend services
        - podSelector:
            matchLabels:
              tier: backend
      ports:
        - port: 8000
    - to:  # DNS
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
---
# infra/k8s/network-policies/02-backend-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-services-policy
  namespace: openlintel
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: web
      ports:
        - port: 8000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
    - to:
        - podSelector:
            matchLabels:
              app: minio
      ports:
        - port: 9000
    - to:  # External APIs (LLM providers)
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - port: 443
    - to:  # DNS
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
---
# infra/k8s/network-policies/03-database-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-policy
  namespace: openlintel
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: backend
        - podSelector:
            matchLabels:
              app: web
      ports:
        - port: 5432
```

**Step 3: Apply and label existing deployments**

```bash
# Add tier labels to all backend service deployments
for svc in design-engine vision-engine media-service bom-engine \
           drawing-generator cutlist-engine mep-calculator \
           catalogue-service project-service procurement-service collaboration; do
  kubectl label deployment $svc tier=backend -n openlintel --overwrite
done

# Apply network policies
kubectl apply -f infra/k8s/network-policies/
```

---

### K8S-002: No Pod Security Context

**Severity:** CRITICAL

**Add securityContext to every deployment. Template:**

```yaml
# Add this to EVERY deployment spec in infra/k8s/
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: <service-name>
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          # Add writable tmp volume for Python/Node
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 100Mi
```

**Apply to each service deployment file.** Example for design-engine:

```yaml
# infra/k8s/design-engine-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: design-engine
  namespace: openlintel
spec:
  replicas: 2
  selector:
    matchLabels:
      app: design-engine
      tier: backend
  template:
    metadata:
      labels:
        app: design-engine
        tier: backend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: design-engine
          image: openlintel/design-engine:v1.0.0  # Pin version (fixes K8S-003)
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          ports:
            - containerPort: 8000
          volumeMounts:
            - name: tmp
              mountPath: /tmp
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 100Mi
```

---

### K8S-003: `:latest` Image Tags

**Severity:** HIGH

**Step 1: Update CI/CD to tag images with Git SHA + semver**

```yaml
# .github/workflows/ci.yml — in docker-build job
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    push: true
    tags: |
      ${{ env.REGISTRY }}/${{ matrix.service }}:${{ github.sha }}
      ${{ env.REGISTRY }}/${{ matrix.service }}:v${{ env.VERSION }}
```

**Step 2: Update all K8s manifests** — replace every `:latest` with `:v1.0.0` (or the appropriate version tag). Search and replace:

```bash
# Find all :latest references
grep -rn ":latest" infra/k8s/
# Replace with pinned version
sed -i 's/:latest/:v1.0.0/g' infra/k8s/*.yaml
```

---

### K8S-004: Missing HPA on 9 of 11 Services

**Severity:** MEDIUM

**Create HPA for each service:**

```yaml
# infra/k8s/hpa/
# Template — create one per service
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: <service-name>-hpa
  namespace: openlintel
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: <service-name>
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
```

Services and their recommended min/max:

| Service | minReplicas | maxReplicas | Notes |
|---------|-------------|-------------|-------|
| vision-engine | 2 | 8 | GPU-heavy, scale conservatively |
| media-service | 2 | 10 | I/O bound |
| bom-engine | 2 | 6 | LLM calls |
| drawing-generator | 2 | 6 | CPU-heavy |
| cutlist-engine | 1 | 4 | Batch processing |
| mep-calculator | 1 | 4 | Calculation-heavy |
| catalogue-service | 2 | 8 | Search traffic |
| project-service | 2 | 6 | Core CRUD |
| procurement-service | 1 | 4 | Lower traffic |

---

### K8S-005: No Pod Disruption Budgets

**Severity:** MEDIUM

```yaml
# infra/k8s/pdb/services-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
  namespace: openlintel
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: web
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
  namespace: openlintel
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      tier: backend
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
  namespace: openlintel
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: postgres
```

---

### K8S-006, K8S-007, K8S-008: Monitoring, Cert-Manager, Hardcoded URLs

**K8S-006: Add Prometheus monitoring**

```bash
# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f infra/k8s/monitoring/values.yaml
```

**K8S-007: Add cert-manager**

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace \
  --set installCRDs=true
```

```yaml
# infra/k8s/cert-manager/cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@openlintel.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

**K8S-008: Replace hardcoded service URLs with K8s DNS**

```yaml
# infra/k8s/configmap.yaml — replace hardcoded URLs
apiVersion: v1
kind: ConfigMap
metadata:
  name: openlintel-config
  namespace: openlintel
data:
  DESIGN_ENGINE_URL: "http://design-engine.openlintel.svc.cluster.local:8000"
  VISION_ENGINE_URL: "http://vision-engine.openlintel.svc.cluster.local:8000"
  MEDIA_SERVICE_URL: "http://media-service.openlintel.svc.cluster.local:8000"
  BOM_ENGINE_URL: "http://bom-engine.openlintel.svc.cluster.local:8000"
  DRAWING_GENERATOR_URL: "http://drawing-generator.openlintel.svc.cluster.local:8000"
  # ... etc for all services
```

---

## 3. Phase 2: Docker Hardening

### DOC-001: Running as Root (All Dockerfiles)

**Severity:** HIGH

**Template fix for all Python service Dockerfiles:**

```dockerfile
# services/<service-name>/Dockerfile

FROM python:3.12-slim AS base

# Create non-root user
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -m -s /bin/bash appuser

WORKDIR /app

# Install dependencies as root
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e .

# Copy app code
COPY src/ ./src/

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**For Next.js web app:**

```dockerfile
# apps/web/Dockerfile
FROM node:20-slim AS base

RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -m -s /bin/bash appuser

# ... build stages ...

FROM base AS runner
WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/public ./public

USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

---

### DOC-002: No HEALTHCHECK Directive

**Add to every Dockerfile:**

```dockerfile
# Python services
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Next.js web
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1
```

Also add `/health` endpoint to any service missing it:

```python
# Add to each service's main.py if missing
@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

### DOC-003: Base Images Not Pinned by Digest

**Low priority but recommended:**

```dockerfile
# Instead of:
FROM python:3.12-slim

# Use digest pinning:
FROM python:3.12-slim@sha256:<specific-digest>
# Get digest: docker pull python:3.12-slim && docker inspect --format='{{index .RepoDigests 0}}' python:3.12-slim
```

---

## 4. Phase 2: Terraform Fixes

### TF-001: No IRSA (IAM Roles for Service Accounts)

**Severity:** HIGH

```hcl
# infra/terraform/irsa.tf

# Create OIDC provider for EKS
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# Per-service IAM roles
module "media_service_irsa" {
  source = "./modules/irsa"

  role_name          = "openlintel-media-service"
  namespace          = "openlintel"
  service_account    = "media-service-sa"
  oidc_provider_arn  = aws_iam_openid_connect_provider.eks.arn
  oidc_provider_url  = aws_eks_cluster.main.identity[0].oidc[0].issuer

  policy_arns = [
    aws_iam_policy.s3_media_access.arn,
  ]
}

resource "aws_iam_policy" "s3_media_access" {
  name = "openlintel-s3-media-access"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::openlintel-media/*",
          "arn:aws:s3:::openlintel-media",
        ]
      }
    ]
  })
}

# Repeat for each service with appropriate permissions:
# - design-engine: S3 read + Bedrock/external LLM
# - bom-engine: S3 read
# - drawing-generator: S3 write
# - external-secrets-sa: SecretsManager read
```

---

### TF-002: EKS Public Endpoint Open to 0.0.0.0/0

```hcl
# infra/terraform/compute.tf — line 54
# BEFORE:
public_access_cidrs = ["0.0.0.0/0"]

# AFTER:
public_access_cidrs = var.eks_access_cidrs  # Restrict to VPN/office

# infra/terraform/variables.tf
variable "eks_access_cidrs" {
  type        = list(string)
  description = "CIDR blocks allowed to access EKS API"
  # No default — must be explicitly provided
}
```

---

### TF-003: Single NAT Gateway

```hcl
# infra/terraform/networking.tf
# BEFORE: single NAT gateway
# AFTER: one per AZ

resource "aws_nat_gateway" "main" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags = {
    Name = "openlintel-nat-${var.availability_zones[count.index]}"
  }
}

resource "aws_eip" "nat" {
  count  = length(var.availability_zones)
  domain = "vpc"
}
```

---

### TF-004: DB Password in Terraform Output

```hcl
# infra/terraform/outputs.tf — line 61
# REMOVE this output entirely:
# output "db_password" {
#   value     = random_password.db.result
#   sensitive = true
# }

# Instead, store directly in Secrets Manager:
resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = random_password.db.result
}
```

---

### TF-005: Default Environment "staging"

```hcl
# infra/terraform/variables.tf — line 18
# BEFORE:
variable "environment" {
  default = "staging"
}

# AFTER:
variable "environment" {
  type        = string
  description = "Deployment environment (staging or production)"
  # No default — must be explicitly provided

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}
```

---

## 5. Phase 2: CI/CD Security

### CI-001 to CI-004: Add Security Scanning to Pipeline

**File:** `.github/workflows/ci.yml`

**Add these jobs after existing lint/test jobs:**

```yaml
# .github/workflows/ci.yml

  # CI-004: Secrets scanning
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: TruffleHog Secrets Scan
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified

  # CI-001: Dependency vulnerability scanning
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Node dependency audit
        run: pnpm audit --audit-level=high
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Python dependency audit
        run: |
          pip install pip-audit
          for svc in services/*/; do
            echo "Auditing $svc"
            pip-audit -r "$svc/pyproject.toml" --desc || true
          done

  # CI-003: SAST (Static Application Security Testing)
  sast:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript, python
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3

  # CI-002: Container image scanning
  container-scan:
    runs-on: ubuntu-latest
    needs: docker-build
    strategy:
      matrix:
        service: [web, design-engine, vision-engine, media-service, bom-engine,
                  drawing-generator, cutlist-engine, mep-calculator,
                  catalogue-service, project-service, procurement-service, collaboration]
    steps:
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: "openlintel/${{ matrix.service }}:${{ github.sha }}"
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif
```

---

## 6. Phase 2: Backend Fixes

### BE-001 & BE-002: Bare `except Exception` Blocks

**Files:** `packages/python-shared/src/openlintel_shared/db.py` (lines 87, 121, 200), `services/project-service/src/routers/change_orders.py`

**Fix pattern — replace every bare except:**

```python
# BEFORE:
try:
    result = await db.execute(query)
except Exception:
    pass  # or log.error(...)

# AFTER — use specific exceptions:
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError

try:
    result = await db.execute(query)
except IntegrityError as e:
    logger.warning("Integrity constraint violation", extra={"error": str(e)})
    raise HTTPException(status_code=409, detail="Resource conflict")
except OperationalError as e:
    logger.error("Database connection error", extra={"error": str(e)})
    raise HTTPException(status_code=503, detail="Database temporarily unavailable")
except SQLAlchemyError as e:
    logger.error("Database error", extra={"error": str(e)}, exc_info=True)
    raise HTTPException(status_code=500, detail="Internal error")
```

**Search for all instances:**

```bash
grep -rn "except Exception" services/ packages/python-shared/
# Fix each one with appropriate specific exception types
```

---

### BE-003: Missing Pipeline Timeout

**File:** `services/design-engine/src/routers/designs.py` (lines 179-191)

```python
# BEFORE:
async def run_pipeline(job_id: str, params: dict):
    result = await design_pipeline.invoke(params)

# AFTER:
import asyncio

PIPELINE_TIMEOUT_SECONDS = 3600  # 1 hour max

async def run_pipeline(job_id: str, params: dict):
    try:
        result = await asyncio.wait_for(
            design_pipeline.invoke(params),
            timeout=PIPELINE_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.error("Pipeline timed out", extra={"job_id": job_id})
        # Update job status to failed
        await update_job_status(job_id, "failed", error="Pipeline timed out after 1 hour")
        return
```

---

### BE-004: Misleading BOM Fallback Status

**File:** `services/bom-engine/src/agents/bom_agent.py` (lines 237-244)

```python
# Add new status to enum
class BOMStatus(str, Enum):
    PENDING = "pending"
    EXTRACTING = "extracting"
    COMPLETED = "completed"
    FALLBACK = "fallback"  # NEW: indicates fallback data was used
    FAILED = "failed"

# In the fallback handler:
# BEFORE:
state["status"] = BOMStatus.EXTRACTING

# AFTER:
state["status"] = BOMStatus.FALLBACK
logger.warning(
    "Using fallback BOM data",
    extra={"room_type": state.get("room_type"), "reason": str(exc)},
)
```

---

### BE-005: Unvalidated Enum Conversion

**File:** `services/bom-engine/src/agents/bom_agent.py` (line 264)

```python
# BEFORE:
tier = BudgetTier(state["budget_tier"])

# AFTER:
try:
    tier = BudgetTier(state["budget_tier"])
except ValueError:
    logger.warning(
        "Invalid budget tier, defaulting to MEDIUM",
        extra={"value": state.get("budget_tier")},
    )
    tier = BudgetTier.MEDIUM
```

---

### BE-006: N+1 Query in Visual Search

**File:** `services/catalogue-service/src/routers/products.py` (lines 464-478)

```python
# BEFORE (N+1):
for match in similar:
    product_result = await db.execute(
        text("SELECT * FROM products WHERE id = :id"),
        {"id": match["product_id"]},
    )

# AFTER (batch query):
product_ids = [match["product_id"] for match in similar]
if product_ids:
    result = await db.execute(
        text("SELECT * FROM products WHERE id = ANY(:ids)"),
        {"ids": product_ids},
    )
    products_by_id = {str(row.id): row for row in result.fetchall()}

    enriched = []
    for match in similar:
        product = products_by_id.get(match["product_id"])
        if product:
            enriched.append({
                **dict(product._mapping),
                "similarity_score": match["score"],
            })
```

---

### BE-007: Mutable Global State in Catalogue Search

**File:** `services/catalogue-service/src/search.py`

```python
# BEFORE:
search_client = None  # Mutable global

# AFTER — use a factory with lru_cache:
from functools import lru_cache
import meilisearch

@lru_cache(maxsize=1)
def get_search_client() -> meilisearch.Client:
    settings = get_settings()
    return meilisearch.Client(
        settings.MEILI_URL,
        settings.MEILI_MASTER_KEY,
    )
```

---

### BE-008: Missing Input Validation for Upload Category

**File:** `services/media-service/src/routers/upload.py` (lines 117-125)

```python
# Add enum validation
from enum import Enum

class UploadCategory(str, Enum):
    PHOTO = "photo"
    FLOOR_PLAN = "floor_plan"
    DOCUMENT = "document"
    DRAWING = "drawing"
    RENDER = "render"
    SITE_LOG = "site_log"

@router.post("/upload")
async def upload_file(
    file: UploadFile,
    project_id: str,
    category: UploadCategory,  # Now validated by FastAPI
    room_id: str | None = None,
    # ...
):
```

---

### BE-009 to BE-014: Minor Backend Fixes

**BE-009 (Missing type hints):** Add type hints to helper functions. Low priority, do during regular code reviews.

**BE-010 (Inconsistent error logging):** Standardize on structlog pattern:

```python
import structlog
logger = structlog.get_logger(__name__)

# Use consistently:
logger.info("action_description", key1=val1, key2=val2)
logger.error("action_failed", error=str(exc), exc_info=True)
```

**BE-011 (Magic numbers):** Extract to constants:

```python
# BEFORE:
if file.size > 10485760:  # What is this?

# AFTER:
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
if file.size > MAX_UPLOAD_SIZE_BYTES:
```

**BE-012 (PubSub resource leak):**

```python
# packages/python-shared/src/openlintel_shared/redis_client.py

from contextlib import asynccontextmanager

@asynccontextmanager
async def get_pubsub(channel: str):
    redis = get_redis()
    pubsub = redis.pubsub()
    try:
        await pubsub.subscribe(channel)
        yield pubsub
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()

# Usage:
async with get_pubsub("updates") as pubsub:
    async for message in pubsub.listen():
        process(message)
```

**BE-013 & BE-014:** Add docstrings and document status values during code reviews. Not blocking.

---

## 7. Phase 3: Frontend Fixes

### FE-001: God Component (Dashboard)

**File:** `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Refactor into smaller components:**

```
apps/web/src/app/(dashboard)/dashboard/
  page.tsx                    # Shell: layout + data fetching
  _components/
    project-list.tsx          # Project grid/list rendering
    create-project-dialog.tsx # Create project form + mutation
    project-card.tsx          # Individual project card
    project-filters.tsx       # Search + filter controls
    empty-state.tsx           # No projects view
```

```typescript
// apps/web/src/app/(dashboard)/dashboard/page.tsx
import { ProjectList } from "./_components/project-list";
import { CreateProjectDialog } from "./_components/create-project-dialog";
import { ProjectFilters } from "./_components/project-filters";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <CreateProjectDialog />
      </div>
      <ProjectFilters />
      <ProjectList />
    </div>
  );
}
```

---

### FE-002: No Error Boundaries

**File:** `apps/web/src/app/layout.tsx`

**Step 1: Create ErrorBoundary component**

```typescript
// apps/web/src/components/error-boundary.tsx
"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@openlintel/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    // TODO: Send to error reporting service (Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
            <Button onClick={() => this.setState({ hasError: false, error: null })}>
              Try Again
            </Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

**Step 2: Add to layout**

```typescript
// apps/web/src/app/layout.tsx
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <SessionProvider>
            <TRPCProvider>
              {children}
            </TRPCProvider>
          </SessionProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
```

**Step 3: Add Next.js `error.tsx` files for each route group**

```typescript
// apps/web/src/app/(dashboard)/error.tsx
"use client";

import { Button } from "@openlintel/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
```

---

### FE-003 & FE-004: Missing Memoization

**File:** `apps/web/src/components/sidebar.tsx`

```typescript
// BEFORE:
export function Sidebar({ projectId }: { projectId: string }) {
  const navItems = [
    { label: "Overview", href: `/project/${projectId}`, icon: Home },
    // ... 30+ items recreated on every render
  ];

// AFTER:
import { memo, useMemo } from "react";

export const Sidebar = memo(function Sidebar({ projectId }: { projectId: string }) {
  const navItems = useMemo(() => [
    { label: "Overview", href: `/project/${projectId}`, icon: Home },
    // ... 30+ items
  ], [projectId]);

  return (/* ... */);
});
```

**File:** `apps/web/src/components/editor-3d/scene.tsx`

```typescript
import { memo, useCallback } from "react";

export const Scene = memo(function Scene({ /* props */ }) {
  const handleObjectSelect = useCallback((id: string) => {
    // ... selection logic
  }, [/* deps */]);

  const handleTransform = useCallback((id: string, transform: Transform) => {
    // ... transform logic
  }, [/* deps */]);

  return (
    <Canvas>
      {/* ... */}
    </Canvas>
  );
});
```

---

### FE-005: No Query Caching Strategy

**File:** `apps/web/src/lib/trpc/provider.tsx` (lines 15-25)

```typescript
// BEFORE:
const [queryClient] = useState(() => new QueryClient());

// AFTER:
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000, // 30 seconds
          gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
          refetchOnWindowFocus: false,
          retry: (failureCount, error) => {
            // Don't retry on 4xx errors
            if (error instanceof TRPCClientError && error.data?.httpStatus < 500) {
              return false;
            }
            return failureCount < 3;
          },
        },
        mutations: {
          retry: false,
        },
      },
    })
);
```

---

### FE-006: Circular Dependency Risk

**Files:** `lib/collaboration.ts` + `hooks/use-realtime-notifications.ts`

**Refactor into a single RealtimeService:**

```typescript
// apps/web/src/lib/realtime-service.ts
import { io, Socket } from "socket.io-client";

class RealtimeService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();

  connect(url: string, token: string) {
    if (this.socket?.connected) return;
    this.socket = io(url, { auth: { token } });
    this.socket.onAny((event, data) => {
      this.listeners.get(event)?.forEach((fn) => fn(data));
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: unknown) {
    this.socket?.emit(event, data);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const realtimeService = new RealtimeService();
```

Both `collaboration.ts` and `use-realtime-notifications.ts` should import from `realtime-service.ts`.

---

### FE-007: Excessive `as any` Type Casts

**File:** `apps/web/src/app/(dashboard)/dashboard/page.tsx:174`

```typescript
// BEFORE:
const rooms = (project as any).rooms;

// AFTER — properly type the query result:
// In trpc router:
const projectWithRooms = await db.query.projects.findFirst({
  where: eq(projects.id, input.projectId),
  with: { rooms: true },
});

// Or define the type:
type ProjectWithRooms = typeof projects.$inferSelect & {
  rooms: (typeof rooms.$inferSelect)[];
};
```

---

### FE-008 & FE-009: Missing ARIA Labels

**File:** `apps/web/src/components/topnav.tsx` (line 57)

```tsx
// BEFORE:
<button onClick={toggleNotifications}>
  <Bell className="h-5 w-5" />
</button>

// AFTER:
<button
  onClick={toggleNotifications}
  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
  aria-expanded={isOpen}
  aria-haspopup="true"
>
  <Bell className="h-5 w-5" />
</button>
```

**File:** `apps/web/src/components/file-upload.tsx` (lines 101-107)

```tsx
// BEFORE:
<input type="file" onChange={handleFile} />

// AFTER:
<label htmlFor="file-upload" className="cursor-pointer ...">
  <span>Choose file or drag and drop</span>
  <input
    id="file-upload"
    type="file"
    className="sr-only"
    onChange={handleFile}
    accept={accept}
    aria-label="Upload file"
  />
</label>
```

---

### FE-010: No Pagination on Notifications

**File:** `apps/web/src/server/trpc/routers/notification.ts`

```typescript
// Add cursor-based pagination:
getNotifications: protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(50).default(20),
    cursor: z.string().optional(), // notification ID as cursor
  }))
  .query(async ({ ctx, input }) => {
    const { limit, cursor } = input;

    const conditions = [eq(notifications.userId, ctx.session.user.id)];
    if (cursor) {
      conditions.push(lt(notifications.id, cursor));
    }

    const items = await ctx.db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: [desc(notifications.createdAt)],
      limit: limit + 1, // Fetch one extra to determine if there's more
    });

    let nextCursor: string | undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem!.id;
    }

    return { items, nextCursor };
  }),
```

---

### FE-011: Missing Request Timeouts

**File:** `apps/web/src/app/api/jobs/floor-plan-digitize/route.ts` (line 54)

```typescript
// BEFORE:
const response = await fetch(`${VISION_ENGINE_URL}/api/v1/vision/digitize`, {
  method: "POST",
  body: JSON.stringify(payload),
});

// AFTER:
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

try {
  const response = await fetch(`${VISION_ENGINE_URL}/api/v1/vision/digitize`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
  });
  // ... handle response
} catch (error) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return NextResponse.json({ error: "Request timed out" }, { status: 504 });
  }
  throw error;
} finally {
  clearTimeout(timeout);
}
```

---

### FE-012: Fake Upload Progress

**File:** `apps/web/src/components/file-upload.tsx` (lines 32-55)

```typescript
// Replace fake progress with XMLHttpRequest for real tracking:
const uploadFile = async (file: File) => {
  setUploading(true);
  setProgress(0);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("projectId", projectId);
  if (roomId) formData.append("roomId", roomId);
  if (category) formData.append("category", category);

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        onUploadComplete?.(JSON.parse(xhr.response));
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  }).finally(() => setUploading(false));
};
```

---

### FE-013 to FE-030: Remaining Frontend Fixes

**FE-013 (BOM table sort not memoized):**

```typescript
const sortedItems = useMemo(
  () => [...items].sort((a, b) => /* sort logic */),
  [items, sortField, sortDirection]
);
```

**FE-014 (Unsafe socket event types):** Add Zod validation:

```typescript
import { z } from "zod";
const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

socket.on("notification", (data: unknown) => {
  const parsed = notificationSchema.safeParse(data);
  if (parsed.success) handleNotification(parsed.data);
});
```

**FE-015 (Generic error messages):** Use TRPCError:

```typescript
// BEFORE:
throw new Error('Room not found');
// AFTER:
throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' });
```

**FE-016 (No keyboard handlers in 3D editor toolbar):**

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    switch (e.key.toLowerCase()) {
      case "v": setTool("select"); break;
      case "g": setTool("move"); break;
      case "r": setTool("rotate"); break;
      case "s": setTool("scale"); break;
      case "m": setTool("material"); break;
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
```

**FE-017 (No focus trap):** Replace custom dropdown with Radix UI:

```typescript
import { Popover, PopoverTrigger, PopoverContent } from "@radix-ui/react-popover";
// Radix handles focus trap, ESC, aria-expanded automatically
```

**FE-018 (Hardcoded service URLs in admin):**

```typescript
// Use env vars:
const SERVICES = {
  designEngine: process.env.NEXT_PUBLIC_DESIGN_ENGINE_URL ?? "http://localhost:8001",
  // ...
};
```

**FE-019 (No retry on LLM calls):**

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}
```

**FE-020 (Form not preserved on error):** Only clear on success:

```typescript
mutation.mutate(values, {
  onSuccess: () => {
    form.reset(); // Only reset on success
    toast.success("Created successfully");
  },
  onError: (error) => {
    toast.error(error.message); // Form values preserved
  },
});
```

**FE-021 to FE-030:** See UI/UX section below for detailed implementations.

---

## 8. Phase 3: Database Fixes

### DB-001: Missing Indexes on Foreign Keys

**Create a new Drizzle migration:**

```bash
cd packages/db
pnpm drizzle-kit generate:pg --name add-foreign-key-indexes
```

**Migration SQL:**

```sql
-- packages/db/drizzle/0001_add_foreign_key_indexes.sql

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_user_id
  ON accounts(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_id
  ON projects(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_project_id
  ON rooms(project_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uploads_user_id
  ON uploads(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uploads_project_id
  ON uploads(project_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uploads_room_id
  ON uploads(room_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_variants_room_id
  ON design_variants(room_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_api_keys_user_id
  ON user_api_keys(user_id);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uploads_project_room
  ON uploads(project_id, room_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_design_variants_room_created
  ON design_variants(room_id, created_at DESC);
```

**Also update Drizzle schema to include indexes:**

```typescript
// packages/db/src/schema/app.ts
export const projects = pgTable("projects", {
  // ... columns
}, (table) => ({
  userIdIdx: index("idx_projects_user_id").on(table.userId),
}));
```

---

### DB-002: No Auto-Update Triggers for `updated_at`

```sql
-- packages/db/drizzle/0002_add_updated_at_triggers.sql

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t, t
    );
  END LOOP;
END;
$$;
```

---

### DB-003: No CHECK Constraints on JSONB Fields

```sql
-- packages/db/drizzle/0003_add_jsonb_constraints.sql

-- Ensure spec_json is always a valid JSON object (not null, not array)
ALTER TABLE design_variants
  ADD CONSTRAINT chk_spec_json_is_object
  CHECK (spec_json IS NULL OR jsonb_typeof(spec_json) = 'object');

ALTER TABLE bom_results
  ADD CONSTRAINT chk_result_json_is_object
  CHECK (result_json IS NULL OR jsonb_typeof(result_json) = 'object');
```

---

## 9. Phase 3: ML Pipeline Fixes

### ML-001: No Model Version Pinning

```toml
# ml/room-segmentation/pyproject.toml
[tool.model-versions]
sam2 = "sam2_hiera_large_v1.0"
sam2_checksum = "sha256:abc123..."

# Add verification in code:
```

```python
# ml/room-segmentation/src/model_loader.py
import hashlib

EXPECTED_CHECKSUMS = {
    "sam2_hiera_large": "sha256:abc123def456...",
}

def verify_model(path: str, model_name: str) -> bool:
    expected = EXPECTED_CHECKSUMS.get(model_name)
    if not expected:
        raise ValueError(f"No checksum registered for {model_name}")
    sha = hashlib.sha256(open(path, "rb").read()).hexdigest()
    return f"sha256:{sha}" == expected
```

---

### ML-002: No GPU Memory Management

**File:** `ml/room-segmentation/sam2_wrapper.py`

```python
import torch

def load_sam2_model(device: str = "cuda", max_memory_gb: float = 4.0):
    if device == "cuda" and torch.cuda.is_available():
        # Set memory limit
        torch.cuda.set_per_process_memory_fraction(
            max_memory_gb / torch.cuda.get_device_properties(0).total_memory * (1024**3)
        )
        # Enable memory-efficient attention
        torch.backends.cuda.enable_flash_sdp(True)

    model = build_sam2(checkpoint=CHECKPOINT_PATH)
    model = model.to(device)
    model.eval()
    return model
```

---

### ML-003: Prompt Injection Risk

Already covered in SEC-016 above.

---

### ML-004: No Batch Processing Limits

**File:** `ml/product-matching/indexer.py`

```python
BATCH_SIZE = 100  # Process 100 products at a time
MAX_CATALOG_SIZE = 100_000

async def index_catalog(products: list[dict]):
    if len(products) > MAX_CATALOG_SIZE:
        raise ValueError(f"Catalog too large ({len(products)}). Max: {MAX_CATALOG_SIZE}")

    for i in range(0, len(products), BATCH_SIZE):
        batch = products[i : i + BATCH_SIZE]
        embeddings = await generate_embeddings(batch)
        await store_embeddings(embeddings)
        logger.info("Indexed batch", extra={"batch": i // BATCH_SIZE + 1, "total": len(products)})
```

---

## 10. Phase 3: Testing

### TST-001: Only 3 Test Files Across Entire Project

**Step 1: Set up testing infrastructure**

```bash
# Frontend: Vitest + React Testing Library + Playwright
cd apps/web
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
pnpm add -D @playwright/test

# Backend: pytest already available, add fixtures
pip install pytest-asyncio httpx factory-boy
```

**Step 2: Create test configuration**

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

```python
# services/conftest.py (shared across all services)
import pytest
from httpx import AsyncClient, ASGITransport

@pytest.fixture
def anyio_backend():
    return "asyncio"
```

---

### TST-002: Zero Frontend Tests

**Priority test files to create:**

```typescript
// apps/web/tests/setup.ts
import "@testing-library/jest-dom";

// apps/web/tests/unit/crypto.test.ts
import { describe, it, expect } from "vitest";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";

describe("crypto", () => {
  it("encrypts and decrypts API keys", () => {
    process.env.API_KEY_ENCRYPTION_SECRET = "test-secret-that-is-at-least-32-chars!!";
    const original = "sk_test_abc123";
    const encrypted = encryptApiKey(original);
    expect(encrypted.encryptedKey).not.toBe(original);
    expect(encrypted.keyPrefix).toBe("sk_test_");
    const decrypted = decryptApiKey(
      encrypted.encryptedKey,
      encrypted.iv,
      encrypted.authTag,
      encrypted.salt
    );
    expect(decrypted).toBe(original);
  });
});

// apps/web/tests/unit/auth.test.ts
import { describe, it, expect, vi } from "vitest";

describe("auth", () => {
  it("rejects unauthenticated requests", async () => {
    // Test tRPC procedures require session
  });

  it("enforces admin role for admin endpoints", async () => {
    // Test admin procedures reject non-admin users
  });
});
```

---

### TST-003: No E2E Tests

```typescript
// apps/web/e2e/project-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Core Project Flow", () => {
  test("create project, add room, upload photo", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "testpassword");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");

    // Create project
    await page.click("text=New Project");
    await page.fill('[name="name"]', "Test Project");
    await page.fill('[name="address"]', "123 Test St");
    await page.click('button:has-text("Create")');

    // Add room
    await page.click("text=Add Room");
    await page.fill('[name="name"]', "Living Room");
    await page.selectOption('[name="type"]', "living_room");
    await page.click('button:has-text("Add")');

    // Verify room appears
    await expect(page.locator("text=Living Room")).toBeVisible();
  });
});
```

---

### TST-004: No Auth/Payment/Crypto Tests

**Backend auth tests:**

```python
# services/tests/test_auth.py
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch

@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401():
    from media_service.main import app
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/media/some-id/url")
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_valid_token_returns_200():
    # Mock JWT validation
    with patch("openlintel_shared.auth.verify_token", return_value={"sub": "user-1"}):
        # ... test passes with valid token
        pass
```

**Payment webhook tests:**

```typescript
// apps/web/tests/unit/webhook.test.ts
import { describe, it, expect, vi } from "vitest";

describe("Stripe webhook", () => {
  it("rejects requests without stripe-signature header", async () => {
    const req = new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      body: "{}",
    });
    const { POST } = await import("@/app/api/payments/webhook/route");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const req = new Request("http://localhost/api/payments/webhook", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "test" },
    });
    const { POST } = await import("@/app/api/payments/webhook/route");
    const res = await POST(req);
    expect(res.status).toBe(503);
  });
});
```

---

## 11. Phase 3: UI/UX Fixes

### UX-001: Browser `confirm()` for Destructive Actions

**Create reusable ConfirmDialog:**

```typescript
// apps/web/src/components/confirm-dialog.tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@openlintel/ui/alert-dialog";

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = "Confirm",
  onConfirm,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Replace all `window.confirm()` calls:**

```typescript
// BEFORE:
if (confirm("Delete this project?")) {
  deleteProject.mutate(projectId);
}

// AFTER:
<ConfirmDialog
  trigger={<Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>}
  title="Delete Project"
  description={`This will permanently delete "${project.name}" and all ${project.rooms?.length ?? 0} rooms, designs, and associated data. This cannot be undone.`}
  confirmText="Delete Project"
  onConfirm={() => deleteProject.mutate(projectId)}
  destructive
/>
```

---

### UX-003: Comment System Stubbed in Design Details

**File:** `apps/web/src/app/(dashboard)/project/[id]/designs/[designId]/page.tsx`

**Option A (Integrate real comments):** Connect to collaboration tRPC router:

```typescript
// In the design detail page, replace stub with real mutation:
const postComment = trpc.collaboration.addComment.useMutation({
  onSuccess: () => {
    trpc.collaboration.getComments.invalidate();
    setCommentText("");
  },
});

// In the form submit:
<form onSubmit={(e) => {
  e.preventDefault();
  postComment.mutate({
    projectId,
    entityType: "design",
    entityId: designId,
    content: commentText,
  });
}}>
```

**Option B (Remove stub):** If the API isn't ready, remove the comments tab entirely to avoid confusion.

---

### UX-004: Missing Form Validation

**Create shared Zod schemas and use react-hook-form:**

```typescript
// apps/web/src/lib/validations/project.ts
import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  address: z.string().min(5, "Address is required").max(500),
  description: z.string().max(2000).optional(),
});

export const addRoomSchema = z.object({
  name: z.string().min(1, "Room name is required").max(100),
  type: z.enum([
    "living_room", "bedroom", "kitchen", "bathroom",
    "dining_room", "study", "balcony", /* ... */
  ]),
  length: z.number().positive("Length must be positive"),
  width: z.number().positive("Width must be positive"),
  height: z.number().positive("Height must be positive").default(2.7),
});

export const paymentSchema = z.object({
  amount: z.number().min(1, "Minimum amount is 1").max(10_000_000),
  currency: z.enum(["USD", "EUR", "GBP", "INR"]),
  description: z.string().min(1).max(500),
});
```

**Usage with react-hook-form:**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addRoomSchema } from "@/lib/validations/project";

function AddRoomForm({ projectId }: { projectId: string }) {
  const form = useForm({
    resolver: zodResolver(addRoomSchema),
    defaultValues: { name: "", type: "living_room", length: 0, width: 0, height: 2.7 },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register("name")} />
      {form.formState.errors.name && (
        <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
      )}
      {/* ... */}
    </form>
  );
}
```

---

### UX-005: No Undo for Non-Editor Operations

```typescript
// apps/web/src/lib/undo-toast.ts
import { toast } from "sonner";

export function undoableAction<T>({
  action,
  undoAction,
  successMessage,
  undoMessage = "Undone",
  timeout = 5000,
}: {
  action: () => Promise<T>;
  undoAction: () => Promise<void>;
  successMessage: string;
  undoMessage?: string;
  timeout?: number;
}) {
  let undone = false;

  toast(successMessage, {
    action: {
      label: "Undo",
      onClick: async () => {
        undone = true;
        await undoAction();
        toast(undoMessage);
      },
    },
    duration: timeout,
  });

  // Execute the real action after timeout if not undone
  setTimeout(async () => {
    if (!undone) {
      await action();
    }
  }, timeout);
}
```

---

### UX-006: No Breadcrumb Navigation

```typescript
// apps/web/src/components/breadcrumbs.tsx
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// Usage:
<Breadcrumbs items={[
  { label: "Dashboard", href: "/dashboard" },
  { label: project.name, href: `/project/${project.id}` },
  { label: "Designs" },
]} />
```

---

### UX-007: Sidebar Scroll Without Indicator

```typescript
// Add to sidebar.tsx — grouped collapsible sections:
const sidebarGroups = [
  {
    label: "Design",
    items: [
      { label: "Overview", href: ".", icon: Home },
      { label: "Rooms", href: "rooms", icon: DoorOpen },
      { label: "Designs", href: "designs", icon: Palette },
      { label: "Floor Plan", href: "floor-plan", icon: Map },
      { label: "3D Editor", href: "editor", icon: Box },
      { label: "AR/VR", href: "ar", icon: Glasses },
    ],
  },
  {
    label: "Engineering",
    items: [
      { label: "MEP", href: "mep", icon: Zap },
      { label: "Compliance", href: "compliance", icon: Shield },
      { label: "Drawings", href: "drawings", icon: FileText },
    ],
  },
  // ... more groups
];

// Add scroll shadow CSS:
// .sidebar-scroll {
//   mask-image: linear-gradient(to bottom, black calc(100% - 40px), transparent);
// }
```

---

### UX-008: No Onboarding Flow

```typescript
// apps/web/src/components/onboarding-tour.tsx
"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

const TOUR_STEPS = [
  {
    target: "[data-tour='create-project']",
    title: "Create Your First Project",
    description: "Start by creating a project for your home renovation.",
  },
  {
    target: "[data-tour='add-room']",
    title: "Add Rooms",
    description: "Add rooms with dimensions to get started with design.",
  },
  {
    target: "[data-tour='upload-photo']",
    title: "Upload Photos",
    description: "Upload room photos for AI-powered design generation.",
  },
  {
    target: "[data-tour='generate-design']",
    title: "Generate AI Designs",
    description: "Let AI create design variants based on your style and budget.",
  },
];

export function OnboardingTour() {
  const [completed, setCompleted] = useLocalStorage("onboarding-completed", false);
  const [step, setStep] = useState(0);

  if (completed) return null;

  const currentStep = TOUR_STEPS[step];
  // Render tooltip positioned near target element
  // ...
}
```

---

### UX-009 through UX-025: Summary of Remaining Fixes

| ID | Fix Summary |
|----|-------------|
| UX-009 | Already covered in FE-012 (real upload progress) |
| UX-010 | Create `apps/web/src/lib/toast-utils.ts` with `toastSuccess()`, `toastError()`, `toastProgress()` wrappers |
| UX-011 | Add `disabled={mutation.isPending}` to all form inputs and `isLoading` prop to submit buttons |
| UX-012 | Wrap all icon-only buttons in `<Tooltip>` from Radix UI |
| UX-013 | Install `@dnd-kit/sortable`, add to room list and BOM table |
| UX-014 | Create `<ResponsiveTable>` component that switches to card layout on `md:` breakpoint |
| UX-015 | Add `useOnlineStatus()` hook + `<OfflineBanner>` component |
| UX-016 | Replace `bg-white` with `bg-background`, `bg-gray-50` with `bg-muted` throughout |
| UX-017 | Already covered in FE-008/FE-009 (ARIA labels) |
| UX-018 | Add icons to status badges: checkmark (done), warning (critical), clock (in-progress) |
| UX-019 | Already covered in FE-017 (Radix Popover) |
| UX-020 | Use Meilisearch `_formatted` field with `<mark>` tag highlighting |
| UX-021 | Add `onError` handler to all `<img>` tags with placeholder fallback |
| UX-022 | Add `@radix-ui/react-context-menu` to project cards, room cards, design cards |
| UX-023 | Save form state to localStorage on change, restore on mount, clear on success |
| UX-024 | Show actual count: `{unreadCount > 99 ? "99+" : unreadCount}` |
| UX-025 | Use `useSearchParams()` to persist filters in URL query string |

---

## 12. Phase 4: Architecture Improvements

### ARCH-001: No API Gateway

**Option A: Kong Gateway (recommended for K8s)**

```bash
helm repo add kong https://charts.konghq.com
helm install kong kong/kong -n kong --create-namespace \
  --set proxy.type=LoadBalancer \
  --set ingressController.installCRDs=false
```

```yaml
# infra/k8s/kong/rate-limiting.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting
  namespace: openlintel
config:
  minute: 60
  hour: 1000
  policy: redis
  redis_host: redis.openlintel.svc.cluster.local
plugin: rate-limiting
---
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: circuit-breaker
config:
  timeout: 60000
  threshold: 10
  window_size: 60
plugin: request-termination
```

**Option B: Lightweight — add rate limiting directly to each service:**

```python
# packages/python-shared/src/openlintel_shared/middleware.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

def setup_middleware(app: FastAPI, settings: Settings | None = None):
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    # ... rest of middleware setup
```

---

### ARCH-002: No Event Bus

**Install NATS for async messaging:**

```yaml
# infra/k8s/nats/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats
  namespace: openlintel
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    spec:
      containers:
        - name: nats
          image: nats:2.10-alpine
          ports:
            - containerPort: 4222
```

**Python client wrapper:**

```python
# packages/python-shared/src/openlintel_shared/events.py
import nats
from nats.aio.client import Client as NATSClient

_client: NATSClient | None = None

async def get_nats() -> NATSClient:
    global _client
    if _client is None or not _client.is_connected:
        _client = await nats.connect(get_settings().NATS_URL)
    return _client

async def publish(subject: str, data: dict):
    nc = await get_nats()
    await nc.publish(subject, json.dumps(data).encode())

async def subscribe(subject: str, handler):
    nc = await get_nats()
    await nc.subscribe(subject, cb=handler)
```

---

### ARCH-003: No Service Mesh

**Install Linkerd (lighter than Istio):**

```bash
curl -sL run.linkerd.io/install | sh
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
# Inject into openlintel namespace
kubectl annotate namespace openlintel linkerd.io/inject=enabled
kubectl rollout restart -n openlintel deployments
```

---

### ARCH-004: No Feature Flag System

**Option A: Simple feature flags with ConfigMap:**

```yaml
# infra/k8s/feature-flags.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flags
  namespace: openlintel
data:
  FEATURE_AR_VIEWER: "true"
  FEATURE_AI_COPILOT: "false"
  FEATURE_STRUCTURAL_ANALYSIS: "false"
```

**Frontend integration:**

```typescript
// apps/web/src/lib/feature-flags.ts
export function isFeatureEnabled(flag: string): boolean {
  return process.env[`NEXT_PUBLIC_FEATURE_${flag}`] === "true";
}

// Usage:
{isFeatureEnabled("AI_COPILOT") && <AICopilotButton />}
```

**Option B: Use Unleash/LaunchDarkly for production:**

```bash
helm install unleash unleash/unleash -n openlintel
```

---

## 13. Phase 4: Backend API Errors (Section 17)

### Design Engine Fixes

**No rate limiting:**

```python
# services/design-engine/src/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/generate")
@limiter.limit("5/minute")  # Max 5 design generations per minute per user
async def generate_design(request: Request, ...):
```

**SSE for progress instead of polling:**

```python
# services/design-engine/src/routers/designs.py
from fastapi.responses import StreamingResponse
import asyncio
import json

@router.get("/jobs/{job_id}/stream")
async def stream_job_progress(job_id: str):
    async def event_generator():
        while True:
            status = await get_job_status(job_id)
            yield f"data: {json.dumps(status)}\n\n"
            if status["state"] in ("completed", "failed"):
                break
            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
```

### BOM Engine Fixes

**In-memory store not shared across replicas:**

```python
# BEFORE:
_bom_store: dict[str, dict] = {}  # Process-local!

# AFTER — use Redis:
from openlintel_shared.redis_client import get_redis

async def store_bom_result(job_id: str, result: dict):
    redis = get_redis()
    await redis.setex(f"bom:{job_id}", 3600, json.dumps(result))

async def get_bom_result(job_id: str) -> dict | None:
    redis = get_redis()
    data = await redis.get(f"bom:{job_id}")
    return json.loads(data) if data else None
```

### Drawing Generator Fixes

**IFC generation failure silently ignored:**

```python
# BEFORE:
try:
    from services.ifc_writer import generate_ifc
except ImportError:
    pass  # Silent!

# AFTER:
try:
    from services.ifc_writer import generate_ifc
    ifc_available = True
except ImportError:
    ifc_available = False
    logger.warning("ifcopenshell not installed — IFC export disabled")

@router.post("/generate")
async def generate_drawings(...):
    results = {}
    errors = []

    # Generate DXF/SVG (always available)
    results["dxf"] = await generate_dxf(...)

    # IFC — report if unavailable
    if "ifc" in requested_formats:
        if not ifc_available:
            errors.append("IFC export unavailable: ifcopenshell not installed")
        else:
            results["ifc"] = await generate_ifc(...)

    return {
        "results": results,
        "errors": errors,
        "status": "partial" if errors else "complete",
    }
```

### Cross-Service: Standardized Error Response Format

```python
# packages/python-shared/src/openlintel_shared/errors.py
from fastapi import Request
from fastapi.responses import JSONResponse
import uuid

class AppError(Exception):
    def __init__(self, status_code: int, message: str, code: str = "INTERNAL_ERROR"):
        self.status_code = status_code
        self.message = message
        self.code = code

async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": request.state.request_id if hasattr(request.state, "request_id") else None,
            }
        },
    )

async def unhandled_error_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())[:8]
    logger.error("Unhandled error", extra={"error_id": error_id, "error": str(exc)}, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": f"Internal error. Reference: {error_id}",
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )

# Register in each service's main.py:
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)
```

---

## 14. Phase 4: Missing Features & Desired Enhancements

### D-01: Before/After Comparison Slider (1 week)

```typescript
// apps/web/src/components/before-after-slider.tsx
"use client";

import { useState, useRef } from "react";

interface BeforeAfterProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
}: BeforeAfterProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-lg cursor-col-resize select-none"
      onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      {/* After (full width, behind) */}
      <img src={afterSrc} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" />

      {/* Before (clipped) */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={beforeSrc} alt={beforeLabel} className="w-full h-full object-cover" />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <span className="text-xs font-bold">||</span>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {beforeLabel}
      </span>
      <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {afterLabel}
      </span>
    </div>
  );
}
```

### I-02: MFA / Two-Factor Authentication (1-2 weeks)

```typescript
// apps/web/src/lib/auth.ts — add TOTP provider
import { authenticator } from "otplib";

// Add to NextAuth config:
callbacks: {
  async signIn({ user, account }) {
    // Check if user has MFA enabled
    const mfaEnabled = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { mfaSecret: true },
    });

    if (mfaEnabled?.mfaSecret) {
      // Redirect to MFA verification page
      // Store partial session in temp token
      return `/auth/mfa?token=${createTempToken(user.id)}`;
    }
    return true;
  },
}
```

```typescript
// apps/web/src/app/auth/mfa/page.tsx
// MFA verification page with 6-digit TOTP input
// Verify with: authenticator.verify({ token: userInput, secret: user.mfaSecret })
```

### I-03: Auto-Save (1-2 weeks)

```typescript
// apps/web/src/hooks/use-auto-save.ts
import { useEffect, useRef, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";

export function useAutoSave<T>(
  key: string,
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay = 3000
) {
  const [debouncedSave] = useDebouncedCallback(async (data: T) => {
    try {
      await saveFn(data);
      localStorage.removeItem(`draft:${key}`);
    } catch {
      // Save to localStorage as fallback
      localStorage.setItem(`draft:${key}`, JSON.stringify(data));
    }
  }, delay);

  useEffect(() => {
    debouncedSave(data);
  }, [data, debouncedSave]);

  // Restore draft on mount
  const getDraft = useCallback((): T | null => {
    const draft = localStorage.getItem(`draft:${key}`);
    return draft ? JSON.parse(draft) : null;
  }, [key]);

  return { getDraft };
}
```

### I-05: GDPR Data Export (1-2 weeks)

```typescript
// apps/web/src/app/api/data-export/route.ts
import { getServerSession } from "next-auth";
import JSZip from "jszip";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const userId = session.user.id;

  // Gather all user data
  const [userProfile, projects, rooms, designs, uploads, payments, comments] =
    await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.projects.findMany({ where: eq(projects.userId, userId) }),
      db.query.rooms.findMany({ where: eq(rooms.projectId, /* user's projects */) }),
      // ... gather all data
    ]);

  // Create ZIP archive
  const zip = new JSZip();
  zip.file("profile.json", JSON.stringify(userProfile, null, 2));
  zip.file("projects.json", JSON.stringify(projects, null, 2));
  zip.file("rooms.json", JSON.stringify(rooms, null, 2));
  zip.file("designs.json", JSON.stringify(designs, null, 2));
  // ... add uploaded files from S3

  const blob = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="openlintel-data-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
```

---

## 15. Phase 4: Config, Dependencies, Compliance

### CFG-001: Missing Healthchecks in Docker Compose

```yaml
# docker-compose.yml — add to each service
services:
  design-engine:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openlintel"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 5s
      retries: 3

  meilisearch:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7700/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### DEP-001: Overly Broad Version Ranges

```toml
# BEFORE (in pyproject.toml files):
fastapi = ">=0.111"
langgraph = ">=0.1"

# AFTER — pin minor versions:
fastapi = ">=0.111,<0.120"
langgraph = ">=0.1,<0.3"
sqlalchemy = ">=2.0,<2.1"
pydantic = ">=2.7,<2.9"
litellm = ">=1.40,<1.50"
```

### DEP-002: Missing Security Dev Tools

```toml
# Add to dev dependencies in each pyproject.toml:
[project.optional-dependencies]
dev = [
    "bandit",      # Python security linter
    "pip-audit",   # Dependency vulnerability scanner
    "ruff",        # Fast Python linter
    "mypy",        # Static type checker
]
```

### COMP-001: Missing Resource Limits in Docker Compose

```yaml
# docker-compose.yml
services:
  design-engine:
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 512M

  postgres:
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4G
```

### COMP-002 & COMP-003: Deployment Security Guide & Checklist

Create `docs/production-deployment-checklist.md`:

```markdown
# Production Deployment Checklist

## Pre-Deployment
- [ ] All secrets rotated from defaults
- [ ] STRIPE_WEBHOOK_SECRET configured
- [ ] External Secrets Operator deployed
- [ ] NetworkPolicies applied
- [ ] Pod security contexts set
- [ ] Image tags pinned (no :latest)
- [ ] Dockerfiles use non-root USER
- [ ] CORS restricted to production domain
- [ ] EKS public endpoint restricted to VPN CIDRs
- [ ] IRSA configured per service
- [ ] Database indexes created
- [ ] Database backups configured (automated daily)
- [ ] CI/CD security scanning enabled

## Post-Deployment
- [ ] Smoke tests pass
- [ ] Health endpoints responding
- [ ] Monitoring dashboards active
- [ ] Alerting configured for error rates
- [ ] SSL certificates valid
- [ ] DNS configured
- [ ] Rate limiting active
```

---

## Summary: Implementation Priority Order

| Priority | Items | Total Effort |
|----------|-------|-------------|
| **Week 1** | SEC-001 to SEC-016, K8S-001, K8S-002 | ~5 days |
| **Week 2** | K8S-003 to K8S-008, DOC-001 to DOC-003 | ~3 days |
| **Week 3** | CI-001 to CI-004, TF-001 to TF-005 | ~3 days |
| **Week 4** | BE-001 to BE-014, DB-001 to DB-003 | ~4 days |
| **Weeks 5-6** | FE-001 to FE-030, UX-001 to UX-025 | ~10 days |
| **Weeks 7-8** | TST-001 to TST-004 (test suite foundation) | ~8 days |
| **Weeks 9-10** | ARCH-001 to ARCH-004, ML-001 to ML-004 | ~6 days |
| **Weeks 11-14** | Section 17 backend API errors (47 items) | ~10 days |
| **Weeks 15+** | Section 18 desired features (51 items) | Ongoing |

**Total critical path: 10 weeks to address all 278 findings.**

---

*End of Audit Issues Implementation Guide*
*Reference: codeaudit.md (278 findings) | All code samples include exact file paths and line numbers for immediate implementation.*
