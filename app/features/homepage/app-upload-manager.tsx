"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Download, Smartphone, UploadCloud } from "lucide-react";
import { homepageApi } from "./homepage-api";
import type { AppRelease } from "./types";

const MAX_APK_SIZE = 200 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AppUploadManager() {
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void homepageApi.appRelease()
      .then(setRelease)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load app details"))
      .finally(() => setLoading(false));
  }, []);

  const chooseFile = (nextFile: File | null) => {
    setError("");
    setMessage("");
    if (!nextFile) return setFile(null);
    if (!nextFile.name.toLowerCase().endsWith(".apk")) {
      setFile(null);
      return setError("Select an Android .apk file.");
    }
    if (nextFile.size > MAX_APK_SIZE) {
      setFile(null);
      return setError("APK must be 200 MB or smaller.");
    }
    setFile(nextFile);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return setError("Select an APK before uploading.");
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const saved = await homepageApi.uploadApp(file, version);
      setRelease(saved);
      setFile(null);
      setVersion(saved.version ?? "");
      setMessage("App uploaded. The landing-page QR code and download button are now live.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "App upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-upload-admin">
      <section className="page-heading">
        <div>
          <p>Appearance</p>
          <h1>App Upload</h1>
          <span>Publish the Android app used by the landing-page QR code and download button.</span>
        </div>
      </section>

      {error && <div className="api-notice app-upload-error">{error}<button onClick={() => setError("")}>×</button></div>}
      {message && <div className="app-upload-success">{message}</div>}

      <div className="app-upload-grid">
        <form className="app-upload-card" onSubmit={submit}>
          <div className="app-upload-card-icon"><UploadCloud /></div>
          <div>
            <small>ANDROID APPLICATION</small>
            <h2>Upload latest APK</h2>
            <p>The new file replaces the current customer download. Maximum file size: 200 MB.</p>
          </div>
          <label className={`app-apk-picker ${file ? "has-file" : ""}`}>
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              disabled={uploading}
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            <Smartphone />
            <strong>{file ? file.name : "Choose APK file"}</strong>
            <span>{file ? formatBytes(file.size) : "Tap to browse from your device"}</span>
          </label>
          <label className="app-version-field">
            <span>Version (optional)</span>
            <input
              maxLength={80}
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="Example: 1.0.0"
              disabled={uploading}
            />
          </label>
          <button className="primary-button app-upload-submit" disabled={!file || uploading}>
            {uploading ? "Uploading APK..." : "Upload and publish"}
          </button>
        </form>

        <section className="app-current-release">
          <small>CURRENT RELEASE</small>
          {loading ? (
            <p>Loading app details...</p>
          ) : release ? (
            <>
              <div className="app-current-icon"><Smartphone /></div>
              <h2>{release.app_name}</h2>
              <p>{release.version ? `Version ${release.version}` : "Published Android app"}</p>
              <dl>
                <div><dt>File</dt><dd>{release.file_name}</dd></div>
                <div><dt>Size</dt><dd>{formatBytes(release.file_size)}</dd></div>
                <div><dt>Updated</dt><dd>{new Date(release.updated_at).toLocaleString()}</dd></div>
              </dl>
              <a href={release.download_url} target="_blank" rel="noreferrer">
                <Download /> Download current APK
              </a>
            </>
          ) : (
            <div className="app-release-empty">
              <Smartphone />
              <h2>No app uploaded</h2>
              <p>Upload the first APK to show the download section on the storefront.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
