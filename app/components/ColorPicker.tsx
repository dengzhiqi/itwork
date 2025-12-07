interface ColorPickerProps {
    label: string;
    value: string;
    onChange: (color: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
    return (
        <div style={{ marginBottom: "1rem" }}>
            <label style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                color: "var(--text-secondary)",
                marginBottom: "0.5rem"
            }}>
                {label}
            </label>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        width: "60px",
                        height: "40px",
                        border: "1px solid var(--border-light)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                    }}
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    style={{
                        flex: 1,
                        padding: "0.5rem",
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                    }}
                />
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "var(--radius-sm)",
                        background: value,
                        border: "1px solid var(--border-light)",
                    }}
                />
            </div>
        </div>
    );
}
