#!/usr/bin/env bash
# NUSA ISLAND — SEKALI SAJA: izinkan GitHub Actions repo ini login ke Firebase TANPA kunci akun layanan (Workload Identity Federation).
# Dijalankan di Cloud Shell (1 perintah). Tidak membuat kunci/JSON, tidak mengaktifkan layanan berbayar, tidak menyentuh Worker/hosting.
# Hasil: dua nilai NON-rahasia untuk disalin ke GitHub → Settings → Environments → production → Variables.
set -euo pipefail
PROJECT="${FIREBASE_PROJECT:-nusa-island-d2023}"; REPO="${NUSA_REPO:-hanifan-dot/Nusa-island}"; ENVN="${NUSA_ENV:-production}"
POOL=github-nusa; PROV=github; SA_ID=nusa-deploy
echo "Proyek: $PROJECT · Repo: $REPO · Environment: $ENVN"
gcloud config set project "$PROJECT" >/dev/null
PN=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com firebasehosting.googleapis.com --quiet
gcloud iam service-accounts describe "$SA_ID@$PROJECT.iam.gserviceaccount.com" >/dev/null 2>&1 || gcloud iam service-accounts create "$SA_ID" --display-name="Nusa deploy (GitHub OIDC)" --quiet
SA="$SA_ID@$PROJECT.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$SA" --role=roles/firebasehosting.admin --condition=None --quiet >/dev/null
gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1 || gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="GitHub Nusa" --quiet
gcloud iam workload-identity-pools providers describe "$PROV" --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc "$PROV" --location=global --workload-identity-pool="$POOL" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.environment=assertion.environment" \
    --attribute-condition="assertion.repository=='$REPO'" --quiet
# Hanya job dari repo ini yang berjalan di Environment "production" yang boleh memakai akun layanan.
gcloud iam service-accounts add-iam-policy-binding "$SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PN/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO" --quiet >/dev/null
echo; echo "SELESAI. Salin dua nilai ini (bukan rahasia) ke GitHub → Settings → Environments → $ENVN → Environment variables:"
echo "  GCP_WIF_PROVIDER = projects/$PN/locations/global/workloadIdentityPools/$POOL/providers/$PROV"
echo "  GCP_DEPLOY_SA    = $SA"
