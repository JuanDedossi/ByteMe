import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const TOKEN_KEY = 'mordisquitos-token';

export function PinScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string })?.from ?? "/ingredientes";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/auth?pin=${encodeURIComponent(pin)}`);

      if (res.ok) {
        await res.json();
        localStorage.setItem(TOKEN_KEY, pin);
        navigate(from, { replace: true });
      } else if (res.status === 401) {
        setError("PIN incorrecto. Probá de nuevo.");
        setPin("");
      } else {
        setError("Error del servidor. Intentá de nuevo más tarde.");
      }
    } catch {
      setError("No se pudo conectar al servidor. Verificá tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logo}>🍪</div>
        <h1 style={styles.title}>ByteMe</h1>
        <p style={styles.subtitle}>Ingresá el PIN para continuar</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={styles.input}
            autoFocus
            autoComplete="current-password"
          />
          {error && <p style={styles.error}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !pin.trim()}
            style={{
              ...styles.button,
              opacity: loading || !pin.trim() ? 0.6 : 1,
              cursor: loading || !pin.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fefae0",
    padding: "16px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "40px 32px",
    width: "100%",
    maxWidth: "360px",
    textAlign: "center",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  },
  logo: {
    fontSize: "48px",
    marginBottom: "8px",
  },
  title: {
    fontFamily: '"Noto Serif", serif',
    fontSize: "28px",
    fontWeight: 700,
    color: "#1a1a1a",
    margin: "0 0 8px",
  },
  subtitle: {
    fontFamily: '"Manrope", sans-serif',
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 28px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: "18px",
    letterSpacing: "4px",
    textAlign: "center",
    border: "1.5px solid #e5e7eb",
    borderRadius: "12px",
    outline: "none",
    fontFamily: '"Manrope", sans-serif',
    boxSizing: "border-box",
  },
  error: {
    fontFamily: '"Manrope", sans-serif',
    fontSize: "13px",
    color: "#ef4444",
    margin: 0,
  },
  button: {
    backgroundColor: "#ce631b",
    color: "#fefae0",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    fontSize: "16px",
    fontFamily: '"Manrope", sans-serif',
    fontWeight: 600,
    width: "100%",
    transition: "opacity 0.2s",
  },
};
