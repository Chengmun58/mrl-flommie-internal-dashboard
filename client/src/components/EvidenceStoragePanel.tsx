import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { CloudUpload, File, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });

const sizeLabel = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function EvidenceStoragePanel() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [business, setBusiness] = useState<"MUMSRELLE" | "Flommie" | "Both" | "Internal">("Internal");
  const [area, setArea] = useState("Automation");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [confirmedNoPii, setConfirmedNoPii] = useState(false);
  const [message, setMessage] = useState("");

  const filesQuery = trpc.evidence.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const upload = trpc.evidence.upload.useMutation({
    onSuccess: async result => {
      setMessage(`${result.fileName} stored successfully.`);
      setFile(null);
      setEvidenceLabel("");
      setConfirmedNoPii(false);
      if (fileRef.current) fileRef.current.value = "";
      await utils.evidence.list.invalidate();
    },
    onError: error => setMessage(error.message),
  });

  const submit = async () => {
    setMessage("");
    if (!file) return setMessage("Select an evidence file first.");
    if (!ALLOWED_TYPES.has(file.type)) return setMessage("Use PDF, CSV, XLSX, PNG, JPG, WEBP, or TXT.");
    if (file.size > MAX_BYTES) return setMessage("File exceeds the 10 MB limit.");
    if (!evidenceLabel.trim()) return setMessage("Add a short evidence label.");
    if (!confirmedNoPii) return setMessage("Confirm that the file contains no customer PII.");

    const base64Data = await readAsBase64(file);
    upload.mutate({
      fileName: file.name,
      mimeType: file.type,
      base64Data,
      business,
      area: area.trim(),
      evidenceLabel: evidenceLabel.trim(),
      confirmedNoPii: true,
    });
  };

  return (
    <article className="panel storage-panel">
      <div className="panel-heading">
        <div>
          <h3>Evidence file storage</h3>
          <p>Persist non-PII internal evidence. Raw file bytes are stored outside the database.</p>
        </div>
        <span>10 MB MAX</span>
      </div>
      <div className="storage-privacy-note"><ShieldCheck size={17} /><span>Do not upload customer phone numbers, addresses, medical data, identity documents, or other personal data.</span></div>

      {!isAuthenticated ? (
        <div className="storage-login">
          <LockKeyhole size={20} aria-hidden="true" />
          <div><strong>Sign-in required to upload or view stored evidence</strong><p>The Dashboard remains readable; file mutations are protected.</p></div>
          <button className="source-button" type="button" onClick={startLogin} disabled={loading}>Sign in</button>
        </div>
      ) : (
        <>
          <div className="storage-form">
            <label className="file-field">
              <span>Evidence file</span>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.csv,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
                onChange={event => setFile(event.target.files?.[0] ?? null)}
              />
              <small>{file ? `${file.name} · ${sizeLabel(file.size)}` : "PDF, CSV, XLSX, PNG, JPG, WEBP or TXT"}</small>
            </label>
            <label><span>Business</span><select value={business} onChange={event => setBusiness(event.target.value as typeof business)}><option>Internal</option><option>MUMSRELLE</option><option>Flommie</option><option>Both</option></select></label>
            <label><span>Area</span><input value={area} maxLength={80} onChange={event => setArea(event.target.value)} /></label>
            <label><span>Evidence label</span><input value={evidenceLabel} maxLength={180} placeholder="e.g. Make execution result" onChange={event => setEvidenceLabel(event.target.value)} /></label>
          </div>
          <label className="privacy-confirm"><input type="checkbox" checked={confirmedNoPii} onChange={event => setConfirmedNoPii(event.target.checked)} /><ShieldCheck size={17} /><span>I confirm this file contains no customer phone, address, medical data, identity document, or other personal data.</span></label>
          <div className="storage-actions">
            <button className="source-button" type="button" disabled={upload.isPending} onClick={submit}><CloudUpload size={16} />{upload.isPending ? "Uploading…" : "Upload evidence"}</button>
            {message ? <p role="status">{message}</p> : null}
          </div>
          <div className="stored-files">
            <div className="stored-files-heading"><strong>Stored evidence</strong><span>{filesQuery.data?.length ?? 0} records</span></div>
            {filesQuery.isLoading ? <p>Loading stored file metadata…</p> : filesQuery.data?.length ? filesQuery.data.map(item => (
              <a href={item.storageUrl} target="_blank" rel="noreferrer" key={item.id}>
                <File size={17} />
                <span><strong>{item.evidenceLabel}</strong><small>{item.originalName} · {item.business} · {item.area} · {sizeLabel(item.sizeBytes)}</small></span>
              </a>
            )) : <p>No evidence files stored yet.</p>}
          </div>
        </>
      )}
      <p className="storage-boundary">Current control: authenticated upload plus unguessable object key. Full private access roles and signed-download policy are a separate next phase.</p>
    </article>
  );
}
