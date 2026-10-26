import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Copy,
    Download,
    FileSpreadsheet,
    Loader2,
    UploadCloud,
    X,
} from "lucide-react";
import * as XLSX from "xlsx";

import api from "../services/api";
import { useToast } from "./useToast";

/*
 * CSV / Excel import wizard.
 *
 * Steps:
 *   1. pick a file (or download the template)
 *   2. map the sheet's own columns onto the fields we need
 *   3. review what will be created and what is wrong
 *   4. import in small batches with a progress bar
 *   5. download the generated credentials and the failed rows
 *
 * The admin's existing sheet is the source of truth: no fixed
 * template is required, only the column mapping.
 */

const CHUNK_SIZE = 50;

const FIELD_SETS = {
    resident: [
        {
            key: "fullName",
            label: "Full name",
            required: true,
            aliases: ["full name", "fullname", "name", "names", "resident", "resident name", "surname"],
        },
        {
            key: "phoneNumber",
            label: "Phone number",
            required: true,
            aliases: ["phone", "phone number", "phone no", "phonenumber", "mobile", "telephone", "contact", "gsm"],
        },
        {
            key: "houseNumber",
            label: "House number",
            required: true,
            aliases: ["house", "house number", "house no", "houseno", "unit", "flat", "apartment", "plot", "address"],
        },
        {
            key: "email",
            label: "Email",
            required: false,
            aliases: ["email", "e-mail", "email address", "mail"],
        },
        {
            key: "username",
            label: "Username",
            required: false,
            aliases: ["username", "user name", "login", "login id", "user id"],
        },
        {
            key: "password",
            label: "Password",
            required: false,
            aliases: ["password", "pass", "temp password", "temporary password"],
        },
    ],
    security: [
        {
            key: "name",
            label: "Full name",
            required: true,
            aliases: ["full name", "fullname", "name", "names", "security", "guard", "officer", "surname"],
        },
        {
            key: "phoneNumber",
            label: "Phone number",
            required: false,
            aliases: ["phone", "phone number", "phone no", "phonenumber", "mobile", "telephone", "contact", "gsm"],
        },
        {
            key: "email",
            label: "Email",
            required: false,
            aliases: ["email", "e-mail", "email address", "mail"],
        },
        {
            key: "username",
            label: "Username",
            required: false,
            aliases: ["username", "user name", "login", "login id", "user id"],
        },
        {
            key: "password",
            label: "Password",
            required: false,
            aliases: ["password", "pass", "temp password", "temporary password"],
        },
    ],
};

/* ------------------------------------------------------------------ */
/* Parsing helpers                                                     */
/* ------------------------------------------------------------------ */

function normaliseLabel(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function detectDelimiter(text) {
    const sample = text.slice(0, 4000);

    const counts = {
        ",": (sample.match(/,/g) || []).length,
        ";": (sample.match(/;/g) || []).length,
        "\t": (sample.match(/\t/g) || []).length,
    };

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseDelimited(text, delimiter) {
    const rows = [];

    let row = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index++) {
        const character = text[index];

        if (inQuotes) {
            if (character === '"') {
                if (text[index + 1] === '"') {
                    field += '"';
                    index++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += character;
            }

            continue;
        }

        if (character === '"') {
            inQuotes = true;
        } else if (character === delimiter) {
            row.push(field);
            field = "";
        } else if (character === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (character === "\r") {
            if (text[index + 1] === "\n") index++;
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += character;
        }
    }

    row.push(field);
    rows.push(row);

    return rows.filter((cells) =>
        cells.some((cell) => String(cell ?? "").trim() !== "")
    );
}

async function readSheet(file) {
    const name = file.name.toLowerCase();

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: "",
            raw: false,
            blankrows: false,
        });

        return rows
            .map((cells) => cells.map((cell) => String(cell ?? "")))
            .filter((cells) =>
                cells.some((cell) => cell.trim() !== "")
            );
    }

    const text = await file.text();

    return parseDelimited(text, detectDelimiter(text));
}

function uniqueHeaders(rawHeaders) {
    const seen = new Map();

    return rawHeaders.map((raw, index) => {
        const base = String(raw ?? "").trim() || `Column ${index + 1}`;

        const count = (seen.get(base.toLowerCase()) || 0) + 1;
        seen.set(base.toLowerCase(), count);

        return count === 1 ? base : `${base} (${count})`;
    });
}

function autoMap(headers, fields) {
    const mapping = {};

    fields.forEach((field) => {
        const index = headers.findIndex((header) => {
            const normalised = normaliseLabel(header);

            return field.aliases.some(
                (alias) =>
                    normalised === alias ||
                    normalised.startsWith(alias) ||
                    normalised.includes(alias)
            );
        });

        mapping[field.key] = index === -1 ? "" : String(index);
    });

    return mapping;
}

function csvEscape(value) {
    const text = String(value ?? "");

    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}

function downloadCsv(filename, rows) {
    const csv = rows
        .map((row) => row.map(csvEscape).join(","))
        .join("\r\n");

    const blob = new Blob([`\uFEFF${csv}`], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function BulkImportModal({
    open,
    kind = "resident",
    endpoint,
    title,
    subtitle,
    onClose,
    onCreated,
}) {
    const fields = FIELD_SETS[kind] || FIELD_SETS.resident;

    const { showSuccess, showError } = useToast();

    const fileInputRef = useRef(null);

    const [step, setStep] = useState("upload");
    const [fileName, setFileName] = useState("");
    const [headers, setHeaders] = useState([]);
    const [dataRows, setDataRows] = useState([]);
    const [mapping, setMapping] = useState({});
    const [dragging, setDragging] = useState(false);
    const [reading, setReading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    const [failures, setFailures] = useState([]);
    const [credentials, setCredentials] = useState([]);
    const [createdCount, setCreatedCount] = useState(0);

    useEffect(() => {
        if (!open) return;

        function handleKeyDown(event) {
            if (event.key === "Escape" && !importing) {
                onClose();
            }
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, importing, onClose]);

    /* -------------------------------------------------------------- */
    /* Derived: mapped + validated rows                               */
    /* -------------------------------------------------------------- */

    const preview = useMemo(() => {
        const ready = [];
        const problems = [];

        dataRows.forEach((cells, index) => {
            const item = { __row: index + 2 };
            const errors = [];

            fields.forEach((field) => {
                const column = mapping[field.key];

                const value =
                    column === "" || column === undefined
                        ? ""
                        : String(cells[Number(column)] ?? "").trim();

                item[field.key] = value;

                if (field.required && !value) {
                    errors.push(`${field.label} is required`);
                }
            });

            if (
                item.email &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)
            ) {
                errors.push("Email looks invalid");
            }

            if (
                item.phoneNumber &&
                item.phoneNumber.replace(/\D/g, "").length < 7
            ) {
                errors.push("Phone number looks too short");
            }

            const row = {
                rowNumber: item.__row,
                label:
                    item.fullName ||
                    item.name ||
                    item.username ||
                    `Row ${item.__row}`,
                item,
                reason: errors[0] || "",
            };

            if (errors.length > 0) {
                problems.push(row);
            } else {
                ready.push(row);
            }
        });

        // Duplicates inside the file are caught before the server
        // sees them, so the admin can fix the sheet in one pass.
        const usernames = new Set();
        const emails = new Set();

        ready.forEach((row) => {
            const username = row.item.username.toLowerCase();
            const email = row.item.email.toLowerCase();

            if (username) {
                if (usernames.has(username)) {
                    row.reason = "Username repeated in the file";
                    problems.push(row);
                    return;
                }

                usernames.add(username);
            }

            if (email) {
                if (emails.has(email)) {
                    row.reason = "Email repeated in the file";
                    problems.push(row);
                    return;
                }

                emails.add(email);
            }
        });

        const valid = ready.filter((row) => !row.reason);

        return { ready: valid, problems };
    }, [dataRows, mapping, fields]);

    const requiredMissing = fields.filter(
        (field) =>
            field.required &&
            (mapping[field.key] === "" ||
                mapping[field.key] === undefined)
    );

    if (!open) {
        return null;
    }

    /* -------------------------------------------------------------- */
    /* File handling                                                  */
    /* -------------------------------------------------------------- */

    async function handleFile(file) {
        if (!file) return;

        const name = file.name.toLowerCase();

        const supported =
            name.endsWith(".csv") ||
            name.endsWith(".tsv") ||
            name.endsWith(".txt") ||
            name.endsWith(".xlsx") ||
            name.endsWith(".xls");

        if (!supported) {
            showError("Choose a .csv, .xlsx or .xls file.");
            return;
        }

        setReading(true);

        try {
            const rows = await readSheet(file);

            if (rows.length < 2) {
                showError(
                    "That file has no data rows. The first row must be the column names."
                );
                return;
            }

            const nextHeaders = uniqueHeaders(rows[0]);

            setFileName(file.name);
            setHeaders(nextHeaders);
            setDataRows(rows.slice(1));
            setMapping(autoMap(nextHeaders, fields));
            setStep("map");
        } catch (error) {
            console.error(error);
            showError(
                "Could not read that file. If it is an old .xls file, save it as .xlsx or .csv and try again."
            );
        } finally {
            setReading(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    function downloadTemplate() {
        const labels = fields.map((field) =>
            field.key === "password" ? "Password (optional)" : field.label
        );

        const example = fields.map((field) => {
            if (field.key === "fullName") return "Adaeze Okonkwo";
            if (field.key === "name") return "Tunde Bakare";
            if (field.key === "phoneNumber") return "08012345678";
            if (field.key === "houseNumber") return "12B";
            if (field.key === "email") return "adaeze@example.com";
            return "";
        });

        downloadCsv(
            kind === "resident"
                ? "estateflow-resident-import-template.csv"
                : "estateflow-security-import-template.csv",
            [labels, example]
        );
    }

    /* -------------------------------------------------------------- */
    /* Import                                                         */
    /* -------------------------------------------------------------- */

    async function startImport() {
        if (preview.ready.length === 0) {
            showError("There are no valid rows to import.");
            return;
        }

        setStep("importing");
        setImporting(true);
        setFailures(
            preview.problems.map((row) => ({
                row: row.rowNumber,
                label: row.label,
                reason: row.reason,
            }))
        );
        setCredentials([]);
        setCreatedCount(0);
        setProgress({ done: 0, total: preview.ready.length });

        let created = 0;
        const collectedFailures = preview.problems.map((row) => ({
            row: row.rowNumber,
            label: row.label,
            reason: row.reason,
        }));
        const collectedCredentials = [];

        for (
            let start = 0;
            start < preview.ready.length;
            start += CHUNK_SIZE
        ) {
            const chunk = preview.ready.slice(start, start + CHUNK_SIZE);

            const payload = chunk.map((row) => {
                const item = { ...row.item };
                delete item.__row;
                return item;
            });

            try {
                const response = await api.post(endpoint, payload);
                const data = response?.data?.data ?? response?.data ?? {};
                const results = Array.isArray(data.results)
                    ? data.results
                    : [];

                results.forEach((result, index) => {
                    const source = chunk[index];

                    if (!source) return;

                    if (result.success) {
                        created++;

                        collectedCredentials.push({
                            name:
                                source.item.fullName ||
                                source.item.name ||
                                "",
                            houseNumber: source.item.houseNumber || "",
                            phoneNumber: source.item.phoneNumber || "",
                            username: result.username || source.item.username,
                            password:
                                result.temporaryPassword ||
                                source.item.password || "",
                            mustChangePassword: Boolean(result.temporaryPassword),
                        });
                    } else {
                        collectedFailures.push({
                            row: source.rowNumber,
                            label: source.label,
                            reason: result.reason || "Could not be created",
                        });
                    }
                });

                if (results.length === 0) {
                    chunk.forEach((source) => {
                        collectedFailures.push({
                            row: source.rowNumber,
                            label: source.label,
                            reason: "The server returned no result for this row",
                        });
                    });
                }
            } catch (error) {
                const message =
                    error?.response?.data?.message ||
                    error?.message ||
                    "The request failed";

                chunk.forEach((source) => {
                    collectedFailures.push({
                        row: source.rowNumber,
                        label: source.label,
                        reason: message,
                    });
                });

                // Stop here: repeating a failing request for every
                // chunk would just multiply the same error.
                preview.ready
                    .slice(start + CHUNK_SIZE)
                    .forEach((source) => {
                        collectedFailures.push({
                            row: source.rowNumber,
                            label: source.label,
                            reason: "Not imported because an earlier batch failed",
                        });
                    });

                break;
            }

            const done = Math.min(
                start + CHUNK_SIZE,
                preview.ready.length
            );

            setProgress({ done, total: preview.ready.length });
            setCreatedCount(created);
        }

        setCreatedCount(created);
        setCredentials(collectedCredentials);
        setFailures(collectedFailures);
        setImporting(false);
        setStep("done");

        if (created > 0) {
            showSuccess(
                `${created} account${created === 1 ? "" : "s"} created.`
            );

            if (typeof onCreated === "function") {
                onCreated(created);
            }
        }

        if (collectedFailures.length > 0) {
            showError(
                `${collectedFailures.length} row${
                    collectedFailures.length === 1 ? "" : "s"
                } could not be imported. Download the report to fix them.`
            );
        }
    }

    /* -------------------------------------------------------------- */
    /* Downloads                                                      */
    /* -------------------------------------------------------------- */

    function downloadCredentials() {
        const rows = [
            [
                "Name",
                "House",
                "Phone",
                "Username",
                "Password",
                "Must change password on first login",
            ],
        ];

        credentials.forEach((account) => {
            rows.push([
                account.name,
                account.houseNumber,
                account.phoneNumber,
                account.username,
                account.password,
                account.mustChangePassword ? "YES" : "NO",
            ]);
        });

        downloadCsv(
            kind === "resident"
                ? "estateflow-resident-credentials.csv"
                : "estateflow-security-credentials.csv",
            rows
        );
    }

    function downloadFailures() {
        const rows = [["Excel row", "Name / username", "Reason"]];

        failures.forEach((failure) => {
            rows.push([
                failure.row,
                failure.label,
                failure.reason,
            ]);
        });

        downloadCsv("estateflow-import-failures.csv", rows);
    }

    function copyCredentials() {
        const text = credentials
            .map(
                (account) =>
                    `${account.name} | ${account.username} | ${account.password}`
            )
            .join("\n");

        if (navigator.clipboard?.writeText) {
            navigator.clipboard
                .writeText(text)
                .then(() => showSuccess("Credentials copied."))
                .catch(() => showError("Could not copy. Download the CSV instead."));
        }
    }

    /* -------------------------------------------------------------- */
    /* Render                                                         */
    /* -------------------------------------------------------------- */

    const totalRows = preview.ready.length + preview.problems.length;

    return (
        <div className="import-overlay" role="presentation">
            <div
                className="import-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-title"
            >
                <div className="import-header">
                    <div className="import-header-text">
                        <h2 id="import-title">{title}</h2>
                        <p>{subtitle}</p>
                    </div>

                    <button
                        type="button"
                        className="import-close"
                        onClick={onClose}
                        disabled={importing}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="import-body">
                    {/* STEP 1 — UPLOAD */}
                    {step === "upload" && (
                        <div className="import-step">
                            <div
                                className={`import-drop ${
                                    dragging ? "dragging" : ""
                                }`}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setDragging(false);
                                    handleFile(event.dataTransfer.files?.[0]);
                                }}
                            >
                                {reading ? (
                                    <Loader2
                                        size={30}
                                        className="import-spin"
                                    />
                                ) : (
                                    <UploadCloud size={30} />
                                )}

                                <strong>
                                    {reading
                                        ? "Reading the file…"
                                        : "Drop your CSV or Excel file here"}
                                </strong>

                                <span>
                                    .csv, .xlsx or .xls — your existing sheet
                                    is fine, you will map the columns next.
                                </span>

                                <button
                                    type="button"
                                    className="import-btn primary"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    disabled={reading}
                                >
                                    <FileSpreadsheet size={16} />
                                    Choose file
                                </button>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.tsv,.txt,.xlsx,.xls"
                                    hidden
                                    onChange={(event) =>
                                        handleFile(
                                            event.target.files?.[0]
                                        )
                                    }
                                />
                            </div>

                            <div className="import-help">
                                <p>
                                    <strong>Passwords:</strong> leave the
                                    password column out and the system
                                    generates a temporary password for each
                                    account. Every generated password must be
                                    changed at first login. If your sheet has a
                                    password column it is used as-is.
                                </p>

                                <button
                                    type="button"
                                    className="import-link"
                                    onClick={downloadTemplate}
                                >
                                    <Download size={14} />
                                    Download a blank template
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — MAP */}
                    {step === "map" && (
                        <div className="import-step">
                            <div className="import-file">
                                <FileSpreadsheet size={16} />
                                <strong>{fileName}</strong>
                                <span>
                                    {dataRows.length} row
                                    {dataRows.length === 1 ? "" : "s"} found
                                </span>
                            </div>

                            <p className="import-note">
                                Match each field to a column from your sheet.
                                Fields marked <b>required</b> must be mapped.
                            </p>

                            <div className="import-map-grid">
                                {fields.map((field) => (
                                    <label
                                        key={field.key}
                                        className="import-map-row"
                                    >
                                        <span>
                                            {field.label}
                                            {field.required && (
                                                <b className="import-required">
                                                    required
                                                </b>
                                            )}
                                        </span>

                                        <select
                                            value={mapping[field.key] ?? ""}
                                            onChange={(event) =>
                                                setMapping((current) => ({
                                                    ...current,
                                                    [field.key]:
                                                        event.target.value,
                                                }))
                                            }
                                        >
                                            <option value="">
                                                — not in this sheet —
                                            </option>

                                            {headers.map((header, index) => (
                                                <option
                                                    key={`${header}-${index}`}
                                                    value={String(index)}
                                                >
                                                    {header}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                ))}
                            </div>

                            {requiredMissing.length > 0 && (
                                <div className="import-warning">
                                    <AlertTriangle size={15} />
                                    Map the required field
                                    {requiredMissing.length === 1
                                        ? ""
                                        : "s"}
                                    :{" "}
                                    {requiredMissing
                                        .map((field) => field.label)
                                        .join(", ")}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3 — PREVIEW */}
                    {step === "preview" && (
                        <div className="import-step">
                            <div className="import-counts">
                                <span className="import-count ok">
                                    <CheckCircle2 size={15} />
                                    {preview.ready.length} ready
                                </span>

                                <span
                                    className={`import-count ${
                                        preview.problems.length
                                            ? "bad"
                                            : ""
                                    }`}
                                >
                                    <AlertTriangle size={15} />
                                    {preview.problems.length} with problems
                                </span>

                                <span className="import-count">
                                    {totalRows} row
                                    {totalRows === 1 ? "" : "s"} total
                                </span>
                            </div>

                            <div className="import-table-wrap">
                                <table className="import-table">
                                    <thead>
                                        <tr>
                                            <th>Row</th>
                                            {fields.map((field) => (
                                                <th key={field.key}>
                                                    {field.label}
                                                </th>
                                            ))}
                                            <th>Status</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {preview.ready
                                            .slice(0, 12)
                                            .map((row) => (
                                                <tr key={`ok-${row.rowNumber}`}>
                                                    <td>{row.rowNumber}</td>
                                                    {fields.map((field) => (
                                                        <td key={field.key}>
                                                            {row.item[
                                                                field.key
                                                            ] || "—"}
                                                        </td>
                                                    ))}
                                                    <td>
                                                        <span className="import-badge ok">
                                                            Ready
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}

                                        {preview.problems
                                            .slice(0, 12)
                                            .map((row) => (
                                                <tr key={`bad-${row.rowNumber}`}>
                                                    <td>{row.rowNumber}</td>
                                                    {fields.map((field) => (
                                                        <td key={field.key}>
                                                            {row.item[
                                                                field.key
                                                            ] || "—"}
                                                        </td>
                                                    ))}
                                                    <td>
                                                        <span className="import-badge bad">
                                                            {row.reason}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalRows > 24 && (
                                <p className="import-hint">
                                    Showing the first 12 ready and 12 problem
                                    rows. All {totalRows} rows are processed.
                                </p>
                            )}

                            {preview.problems.length > 0 && (
                                <p className="import-hint">
                                    Problem rows are skipped and listed in the
                                    failures report so you can fix and re-import
                                    them.
                                </p>
                            )}
                        </div>
                    )}

                    {/* STEP 4 — IMPORTING */}
                    {step === "importing" && (
                        <div className="import-step import-progress-step">
                            <Loader2 size={30} className="import-spin" />

                            <strong>Importing accounts…</strong>

                            <span>
                                {progress.done} of {progress.total} processed
                            </span>

                            <div className="import-progress">
                                <div
                                    className="import-progress-fill"
                                    style={{
                                        width: `${
                                            progress.total === 0
                                                ? 0
                                                : Math.round(
                                                      (progress.done /
                                                          progress.total) *
                                                          100
                                                  )
                                        }%`,
                                    }}
                                />
                            </div>

                            <span className="import-hint">
                                Keep this window open. Do not refresh the page.
                            </span>
                        </div>
                    )}

                    {/* STEP 5 — DONE */}
                    {step === "done" && (
                        <div className="import-step">
                            <div className="import-done">
                                <CheckCircle2 size={30} />

                                <div>
                                    <strong>
                                        {createdCount} account
                                        {createdCount === 1 ? "" : "s"} created
                                    </strong>

                                    <span>
                                        {failures.length} row
                                        {failures.length === 1 ? "" : "s"} not
                                        imported
                                    </span>
                                </div>
                            </div>

                            {credentials.length > 0 && (
                                <div className="import-result-block">
                                    <div className="import-result-head">
                                        <strong>Credentials</strong>

                                        <div className="import-result-actions">
                                            <button
                                                type="button"
                                                className="import-link"
                                                onClick={copyCredentials}
                                            >
                                                <Copy size={14} />
                                                Copy
                                            </button>

                                            <button
                                                type="button"
                                                className="import-link"
                                                onClick={downloadCredentials}
                                            >
                                                <Download size={14} />
                                                Download CSV
                                            </button>
                                        </div>
                                    </div>

                                    <p className="import-hint">
                                        Download and securely distribute these
                                        credentials. Generated temporary
                                        passwords must be changed at first
                                        login.
                                    </p>

                                    <div className="import-table-wrap small">
                                        <table className="import-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Username</th>
                                                    <th>Password</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {credentials
                                                    .slice(0, 50)
                                                    .map((account, index) => (
                                                        <tr
                                                            key={`${account.username}-${index}`}
                                                        >
                                                            <td>
                                                                {account.name ||
                                                                    "—"}
                                                            </td>
                                                            <td>
                                                                {
                                                                    account.username
                                                                }
                                                            </td>
                                                            <td>
                                                                <code>
                                                                    {
                                                                        account.password
                                                                    }
                                                                </code>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {failures.length > 0 && (
                                <div className="import-result-block">
                                    <div className="import-result-head">
                                        <strong>
                                            Not imported ({failures.length})
                                        </strong>

                                        <button
                                            type="button"
                                            className="import-link"
                                            onClick={downloadFailures}
                                        >
                                            <Download size={14} />
                                            Download report
                                        </button>
                                    </div>

                                    <ul className="import-failures">
                                        {failures
                                            .slice(0, 20)
                                            .map((failure, index) => (
                                                <li
                                                    key={`${failure.row}-${index}`}
                                                >
                                                    <b>Row {failure.row}</b>
                                                    <span>
                                                        {failure.label}
                                                    </span>
                                                    <em>{failure.reason}</em>
                                                </li>
                                            ))}
                                    </ul>

                                    {failures.length > 20 && (
                                        <p className="import-hint">
                                            Showing 20 of {failures.length}.
                                            Download the report for the full
                                            list.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="import-footer">
                    {step === "map" && (
                        <>
                            <button
                                type="button"
                                className="import-btn ghost"
                                onClick={() => setStep("upload")}
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>

                            <button
                                type="button"
                                className="import-btn primary"
                                disabled={requiredMissing.length > 0}
                                onClick={() => setStep("preview")}
                            >
                                Preview
                                <ArrowRight size={16} />
                            </button>
                        </>
                    )}

                    {step === "preview" && (
                        <>
                            <button
                                type="button"
                                className="import-btn ghost"
                                onClick={() => setStep("map")}
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>

                            <button
                                type="button"
                                className="import-btn primary"
                                disabled={preview.ready.length === 0}
                                onClick={startImport}
                            >
                                Import {preview.ready.length} account
                                {preview.ready.length === 1 ? "" : "s"}
                            </button>
                        </>
                    )}

                    {step === "upload" && (
                        <button
                            type="button"
                            className="import-btn ghost"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    )}

                    {step === "done" && (
                        <button
                            type="button"
                            className="import-btn primary"
                            onClick={onClose}
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>

            <style>{importStyles}</style>
        </div>
    );
}

const importStyles = `
.import-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(11, 16, 32, 0.62);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
}

.import-modal {
    width: 100%;
    max-width: 760px;
    max-height: calc(100dvh - 32px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 30px 70px rgba(15, 23, 42, 0.28);
}

.import-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 20px 22px 16px;
    border-bottom: 1px solid #eef1f6;
}

.import-header h2 {
    margin: 0;
    font-size: 19px;
    color: #172033;
}

.import-header p {
    margin: 5px 0 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #8a99b0;
    max-width: 560px;
}

.import-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 10px;
    background: #f3f5fa;
    color: #5b6b85;
    cursor: pointer;
}

.import-close:disabled { opacity: .55; cursor: not-allowed; }

.import-body {
    padding: 18px 22px 20px;
    overflow-y: auto;
    min-height: 0;
}

.import-step { display: flex; flex-direction: column; gap: 14px; }

.import-drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 30px 20px;
    border: 2px dashed #d7deeb;
    border-radius: 16px;
    background: #fafbff;
    color: #6b7a92;
    text-align: center;
    transition: border-color .15s ease, background .15s ease;
}

.import-drop.dragging {
    border-color: #863bff;
    background: #f6f1ff;
}

.import-drop strong {
    font-size: 14px;
    color: #172033;
}

.import-drop span {
    font-size: 12.5px;
    line-height: 1.5;
    max-width: 420px;
}

.import-drop svg { color: #863bff; }

.import-help {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 13px 14px;
    border: 1px solid #eef1f6;
    border-radius: 12px;
    background: #fafbfe;
}

.import-help p {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: #64748b;
}

.import-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: none;
    padding: 0;
    font-size: 12.5px;
    font-weight: 700;
    color: #6d28d9;
    cursor: pointer;
    align-self: flex-start;
}

.import-file {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid #e6ebf4;
    border-radius: 11px;
    background: #f8fafc;
    font-size: 12.5px;
    color: #475467;
    flex-wrap: wrap;
}

.import-file svg { color: #6d28d9; }
.import-file strong { color: #172033; }
.import-file span { color: #8a99b0; }

.import-note {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: #64748b;
}

.import-map-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.import-map-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.import-map-row > span {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: #45536b;
}

.import-required {
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: #b45309;
    background: #fef3c7;
    padding: 2px 6px;
    border-radius: 999px;
}

.import-map-row select {
    height: 42px;
    padding: 0 10px;
    border: 1px solid #dbe2ed;
    border-radius: 10px;
    background: #ffffff;
    color: #172033;
    font-size: 13px;
    outline: none;
}

.import-map-row select:focus {
    border-color: #a78bfa;
    box-shadow: 0 0 0 3px rgba(134, 59, 255, .12);
}

.import-warning {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid #fde68a;
    border-radius: 10px;
    background: #fffbeb;
    color: #92400e;
    font-size: 12px;
    line-height: 1.5;
}

.import-counts {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
}

.import-count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
}

.import-count.ok { color: #15803d; }
.import-count.bad { color: #b91c1c; }

.import-table-wrap {
    border: 1px solid #eef1f6;
    border-radius: 12px;
    overflow: auto;
    max-height: 320px;
}

.import-table-wrap.small { max-height: 230px; }

.import-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
    white-space: nowrap;
}

.import-table th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f8fafc;
    text-align: left;
    padding: 9px 10px;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: .04em;
    color: #7c8ba1;
    border-bottom: 1px solid #eef1f6;
}

.import-table td {
    padding: 8px 10px;
    color: #334155;
    border-bottom: 1px solid #f4f6fa;
}

.import-table tr:last-child td { border-bottom: none; }

.import-table code {
    font-size: 11px;
    background: #f4f1ff;
    color: #5b3fd6;
    padding: 1px 6px;
    border-radius: 5px;
}

.import-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    background: #eef2f7;
    color: #475467;
}

.import-badge.ok { background: #dcfce7; color: #15803d; }
.import-badge.bad { background: #fee2e2; color: #b91c1c; white-space: normal; }

.import-hint {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.5;
    color: #8a99b0;
}

.import-progress-step {
    align-items: center;
    text-align: center;
    padding: 22px 0 10px;
    color: #6d28d9;
}

.import-progress-step strong {
    font-size: 15px;
    color: #172033;
}

.import-progress-step > span {
    font-size: 12.5px;
    color: #64748b;
}

.import-progress {
    width: 100%;
    max-width: 420px;
    height: 9px;
    border-radius: 999px;
    background: #eef2f7;
    overflow: hidden;
}

.import-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #863bff, #6d28d9);
    transition: width .2s ease;
}

.import-done {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid #bbf7d0;
    border-radius: 13px;
    background: #f0fdf4;
    color: #15803d;
}

.import-done div { display: flex; flex-direction: column; gap: 2px; }
.import-done strong { font-size: 14px; color: #14532d; }
.import-done span { font-size: 12px; color: #3f6212; }

.import-result-block {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 12px 13px;
    border: 1px solid #eef1f6;
    border-radius: 12px;
    background: #fafbfe;
}

.import-result-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
}

.import-result-head strong { font-size: 12.5px; color: #172033; }

.import-result-actions {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
}

.import-failures {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 190px;
    overflow-y: auto;
}

.import-failures li {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 11.5px;
    color: #64748b;
}

.import-failures b { color: #172033; }
.import-failures em { color: #b91c1c; font-style: normal; }

.import-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 22px 18px;
    border-top: 1px solid #eef1f6;
}

.import-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 42px;
    padding: 0 18px;
    border-radius: 11px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
}

.import-btn.ghost {
    background: #f3f5fa;
    color: #475467;
    border-color: #e6eaf2;
}

.import-btn.primary {
    background: linear-gradient(135deg, #863bff, #6d28d9);
    color: #ffffff;
    box-shadow: 0 10px 22px rgba(109, 40, 217, .24);
}

.import-btn:disabled { opacity: .55; cursor: not-allowed; }
.import-drop .import-btn { margin-top: 8px; }

.import-spin { animation: import-spin .9s linear infinite; }

@keyframes import-spin {
    to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
    .import-overlay { padding: 10px; align-items: flex-end; }

    .import-modal {
        max-height: calc(100dvh - 20px);
        border-radius: 18px;
    }

    .import-header, .import-body, .import-footer {
        padding-left: 16px;
        padding-right: 16px;
    }

    .import-map-grid { grid-template-columns: 1fr; }

    .import-footer { flex-direction: column-reverse; }
    .import-btn { width: 100%; }
}
`;

export default BulkImportModal;
