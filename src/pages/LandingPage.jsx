import { useEffect } from "react";

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const features = [
  {
    icon: "🗺️",
    title: "Mapa inteligente",
    text: "Organiza zonas, puntos, líneas, componentes y evidencias dentro de cada finca.",
  },
  {
    icon: "📅",
    title: "Calendario Maestro",
    text: "Coordina tareas, procesos, responsables y fechas desde una sola vista operativa.",
  },
  {
    icon: "⚙️",
    title: "Process Lab",
    text: "Diseña procesos agrícolas por etapas y visualiza su avance en tiempo real.",
  },
  {
    icon: "📊",
    title: "Business Intelligence",
    text: "Convierte la operación diaria en indicadores, reportes y mejores decisiones.",
  },
];

const tutorials = [
  {
    title: "Primeros pasos en AgroMind",
    text: "Crea tu finca, define su ubicación y comienza a construir tu espacio de trabajo.",
  },
  {
    title: "Mapa y zonas productivas",
    text: "Aprende a representar la finca y organizar visualmente sus áreas y componentes.",
  },
  {
    title: "Tareas y procesos",
    text: "Planifica actividades, asigna responsables y controla el avance operativo.",
  },
];

export default function LandingPage({ hasSession = false, onOpenAccount }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "AgroMind CR";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  const openLogin = () => navigateTo("/login");
  const openRegister = () => navigateTo("/login?mode=signup");

  return (
    <main className="agromind-landing">
      <style>{`
        :root {
          color-scheme: dark;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #020617;
        }

        .agromind-landing {
          min-height: 100vh;
          overflow-x: hidden;
          color: #e2e8f0;
          background:
            radial-gradient(circle at 8% 4%, rgba(34,197,94,0.13), transparent 25%),
            radial-gradient(circle at 92% 18%, rgba(20,184,166,0.09), transparent 23%),
            linear-gradient(180deg, #030b13 0%, #06131a 48%, #030914 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .landing-container {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }

        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(148,163,184,0.12);
          background: rgba(3,11,19,0.84);
          backdrop-filter: blur(18px);
        }

        .landing-nav-inner {
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .landing-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: #f8fafc;
          text-decoration: none;
        }

        .landing-brand-mark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px 14px 14px 5px;
          border: 1px solid rgba(34,197,94,0.30);
          background: linear-gradient(135deg, rgba(34,197,94,0.24), rgba(20,184,166,0.10));
          color: #bbf7d0;
          font-size: 0.82rem;
          font-weight: 950;
          letter-spacing: 0.06em;
          box-shadow: 0 10px 30px rgba(0,0,0,0.22);
        }

        .landing-brand-copy strong {
          display: block;
        }

        .landing-brand-copy strong {
          font-size: 0.98rem;
        }

        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .landing-btn {
          min-height: 44px;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid transparent;
          font: inherit;
          font-weight: 850;
          cursor: pointer;
          text-decoration: none;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, filter 180ms ease;
        }

        .landing-btn:hover {
          transform: translateY(-1px);
        }

        .landing-btn-primary {
          border-color: rgba(34,197,94,0.38);
          background: linear-gradient(135deg, #18a957, #10866d);
          color: #f8fafc;
          box-shadow: 0 14px 34px rgba(34,197,94,0.20);
        }

        .landing-btn-primary:hover {
          filter: brightness(1.06);
          box-shadow: 0 18px 44px rgba(34,197,94,0.28);
        }

        .landing-btn-secondary {
          border-color: rgba(148,163,184,0.20);
          background: rgba(15,23,42,0.62);
          color: #e2e8f0;
        }

        .landing-btn-secondary:hover {
          border-color: rgba(34,197,94,0.34);
        }

        .landing-hero {
          position: relative;
          padding: clamp(72px, 9vw, 116px) 0 88px;
          isolation: isolate;
        }

        .landing-hero::after {
          content: "";
          position: absolute;
          z-index: -1;
          inset: 8% -12% auto auto;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34,197,94,0.09), transparent 67%);
          filter: blur(12px);
        }

        .landing-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
          gap: clamp(38px, 6vw, 76px);
          align-items: center;
        }

        .landing-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(34,197,94,0.24);
          background: rgba(34,197,94,0.08);
          color: #bbf7d0;
          font-size: 0.76rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .landing-title {
          margin: 22px 0 0;
          max-width: 760px;
          color: #f8fafc;
          font-size: clamp(2.8rem, 6.4vw, 5.35rem);
          line-height: 1;
          letter-spacing: -0.058em;
        }

        .landing-title span {
          color: #4fdd86;
          text-shadow: 0 10px 36px rgba(34,197,94,0.18);
        }

        .landing-lead {
          max-width: 680px;
          margin: 24px 0 0;
          color: rgba(203,213,225,0.82);
          font-size: clamp(1rem, 1.8vw, 1.17rem);
          line-height: 1.72;
        }

        .landing-hero-actions {
          margin-top: 30px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .landing-proof {
          margin-top: 30px;
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          color: rgba(148,163,184,0.88);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .landing-proof span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .landing-product-frame {
          position: relative;
          min-height: 470px;
          padding: 18px;
          border-radius: 28px 28px 28px 10px;
          border: 1px solid rgba(34,197,94,0.20);
          background:
            radial-gradient(circle at 20% 0%, rgba(34,197,94,0.18), transparent 34%),
            linear-gradient(145deg, rgba(15,23,42,0.98), rgba(2,6,23,0.96));
          box-shadow: 0 34px 90px rgba(0,0,0,0.44), 0 0 0 7px rgba(255,255,255,0.012);
          overflow: hidden;
        }

        .landing-product-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 2px 2px 16px;
        }

        .landing-product-dots {
          display: flex;
          gap: 6px;
        }

        .landing-product-dots span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(148,163,184,0.32);
        }

        .landing-product-chip {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(34,197,94,0.22);
          background: rgba(34,197,94,0.08);
          color: #bbf7d0;
          font-size: 0.68rem;
          font-weight: 900;
        }

        .landing-product-map {
          position: relative;
          height: 250px;
          border-radius: 19px 19px 19px 7px;
          overflow: hidden;
          border: 1px solid rgba(148,163,184,0.14);
          background:
            linear-gradient(35deg, transparent 48%, rgba(56,189,248,0.18) 49%, rgba(56,189,248,0.18) 51%, transparent 52%),
            linear-gradient(-20deg, transparent 46%, rgba(34,197,94,0.18) 47%, rgba(34,197,94,0.18) 52%, transparent 53%),
            radial-gradient(circle at 70% 35%, rgba(34,197,94,0.26), transparent 14%),
            linear-gradient(135deg, #17361f, #10281d 38%, #0d1f1b 70%, #142b22);
        }

        .landing-product-map img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center;
          filter: saturate(0.92) contrast(1.04) brightness(0.82);
        }

        .landing-product-map::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, transparent 58%, rgba(3,11,19,0.22));
        }

        .landing-zone {
          position: absolute;
          border: 2px solid rgba(74,222,128,0.82);
          background: rgba(34,197,94,0.16);
          box-shadow: 0 0 20px rgba(34,197,94,0.16);
        }

        .landing-zone-one {
          width: 36%;
          height: 34%;
          left: 10%;
          top: 18%;
          clip-path: polygon(8% 8%, 92% 0, 100% 82%, 18% 100%, 0 48%);
        }

        .landing-zone-two {
          width: 32%;
          height: 38%;
          right: 10%;
          bottom: 12%;
          border-color: rgba(56,189,248,0.84);
          background: rgba(56,189,248,0.13);
          clip-path: polygon(18% 0, 100% 12%, 84% 100%, 0 78%);
        }

        .landing-product-stats {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .landing-mini-card {
          min-height: 104px;
          padding: 14px;
          border-radius: 16px 16px 16px 6px;
          border: 1px solid rgba(148,163,184,0.12);
          background: rgba(15,23,42,0.64);
        }

        .landing-mini-card span,
        .landing-mini-card strong {
          display: block;
        }

        .landing-mini-card span {
          color: rgba(148,163,184,0.82);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .landing-mini-card strong {
          margin-top: 12px;
          color: #f8fafc;
          font-size: 1.5rem;
        }

        .landing-section {
          position: relative;
          padding: 88px 0;
        }

        .landing-section + .landing-section {
          border-top: 1px solid rgba(148,163,184,0.075);
        }

        .landing-section-header {
          max-width: 720px;
          margin-bottom: 32px;
        }

        .landing-section-header h2 {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(2rem, 4vw, 3.3rem);
          line-height: 1.08;
          letter-spacing: -0.05em;
        }

        .landing-section-header p {
          margin: 16px 0 0;
          color: rgba(203,213,225,0.74);
          line-height: 1.7;
        }

        .landing-features-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .landing-feature-card {
          min-height: 220px;
          padding: 24px;
          border-radius: 24px 24px 24px 8px;
          border: 1px solid rgba(148,163,184,0.13);
          background:
            linear-gradient(135deg, rgba(34,197,94,0.08), transparent 38%),
            linear-gradient(145deg, rgba(15,31,40,0.88), rgba(8,18,29,0.78));
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .landing-feature-card:hover {
          transform: translateY(-3px);
          border-color: rgba(34,197,94,0.26);
          box-shadow: 0 24px 55px rgba(0,0,0,0.28);
        }

        .landing-feature-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px 15px 15px 5px;
          border: 1px solid rgba(34,197,94,0.22);
          background: rgba(34,197,94,0.10);
          font-size: 1.25rem;
        }

        .landing-feature-card h3 {
          margin: 20px 0 0;
          color: #f8fafc;
          font-size: 1.25rem;
        }

        .landing-feature-card p {
          margin: 10px 0 0;
          color: rgba(203,213,225,0.70);
          line-height: 1.65;
        }

        .landing-tutorial-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .landing-tutorial-card {
          overflow: hidden;
          border-radius: 22px 22px 22px 8px;
          border: 1px solid rgba(148,163,184,0.13);
          background: linear-gradient(145deg, rgba(15,31,40,0.88), rgba(8,18,29,0.78));
          box-shadow: 0 18px 45px rgba(0,0,0,0.15);
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .landing-tutorial-card:hover {
          transform: translateY(-3px);
          border-color: rgba(34,197,94,0.25);
          box-shadow: 0 24px 55px rgba(0,0,0,0.25);
        }

        .landing-video-placeholder {
          position: relative;
          aspect-ratio: 16 / 9;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 50% 50%, rgba(34,197,94,0.20), transparent 30%),
            linear-gradient(145deg, #123023, #081720 72%);
        }

        .landing-play {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(74,222,128,0.40);
          background: rgba(2,6,23,0.72);
          color: #bbf7d0;
          font-size: 1.15rem;
          box-shadow: 0 12px 34px rgba(0,0,0,0.35), 0 0 28px rgba(34,197,94,0.12);
        }

        .landing-tutorial-copy {
          padding: 20px;
        }

        .landing-tutorial-copy h3 {
          margin: 0;
          color: #f8fafc;
          font-size: 1rem;
        }

        .landing-tutorial-copy p {
          margin: 9px 0 0;
          color: rgba(203,213,225,0.67);
          font-size: 0.86rem;
          line-height: 1.55;
        }

        .landing-cta {
          padding: 84px 0 100px;
        }

        .landing-purpose {
          overflow: hidden;
          border-top: 1px solid rgba(148,163,184,0.08);
          border-bottom: 1px solid rgba(148,163,184,0.08);
          background:
            radial-gradient(circle at 85% 18%, rgba(34,197,94,0.10), transparent 30%),
            linear-gradient(145deg, rgba(8,24,27,0.88), rgba(3,11,19,0.96));
        }

        .landing-purpose-grid {
          display: grid;
          grid-template-columns: 0.88fr 1.12fr;
          gap: clamp(28px, 6vw, 76px);
          align-items: stretch;
        }

        .landing-purpose-intro {
          padding-right: clamp(0px, 3vw, 38px);
        }

        .landing-purpose-kicker {
          display: inline-flex;
          margin-bottom: 18px;
          color: #86efac;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .landing-purpose-intro h2 {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(2.2rem, 4vw, 3.7rem);
          line-height: 1.05;
          letter-spacing: -0.052em;
        }

        .landing-purpose-intro p {
          margin: 20px 0 0;
          color: rgba(203,213,225,0.72);
          line-height: 1.75;
        }

        .landing-purpose-cards {
          display: grid;
          gap: 16px;
        }

        .landing-purpose-card {
          padding: clamp(24px, 4vw, 34px);
          border-radius: 24px 24px 24px 8px;
          border: 1px solid rgba(148,163,184,0.13);
          background: rgba(15,31,40,0.68);
          box-shadow: 0 22px 54px rgba(0,0,0,0.18);
        }

        .landing-purpose-card strong {
          display: block;
          color: #5ee08d;
          font-size: 0.78rem;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .landing-purpose-card p {
          margin: 12px 0 0;
          color: rgba(226,232,240,0.84);
          font-size: 1.02rem;
          line-height: 1.7;
        }

        .landing-future-note {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(148,163,184,0.10);
          color: rgba(148,163,184,0.82);
          font-size: 0.82rem;
          line-height: 1.6;
        }

        .landing-cta-card {
          padding: clamp(30px, 6vw, 64px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          border-radius: 30px 30px 30px 10px;
          border: 1px solid rgba(34,197,94,0.24);
          background:
            radial-gradient(circle at 8% 0%, rgba(34,197,94,0.20), transparent 34%),
            radial-gradient(circle at 92% 20%, rgba(20,184,166,0.13), transparent 30%),
            linear-gradient(135deg, rgba(13,34,39,0.98), rgba(4,12,24,0.98));
          box-shadow: 0 30px 80px rgba(0,0,0,0.34);
        }

        .landing-cta-card h2 {
          margin: 0;
          max-width: 650px;
          color: #f8fafc;
          font-size: clamp(2rem, 4vw, 3.6rem);
          line-height: 1.05;
          letter-spacing: -0.05em;
        }

        .landing-cta-card p {
          margin: 14px 0 0;
          color: rgba(203,213,225,0.72);
        }

        .landing-footer {
          padding: 24px 0 34px;
          border-top: 1px solid rgba(148,163,184,0.10);
          color: rgba(148,163,184,0.70);
          font-size: 0.8rem;
        }

        .landing-footer-inner {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .landing-hero-grid {
            grid-template-columns: 1fr;
          }

          .landing-product-frame {
            min-height: 430px;
          }

          .landing-tutorial-grid {
            grid-template-columns: 1fr 1fr;
          }

          .landing-cta-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .landing-purpose-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 680px) {
          .landing-container {
            width: min(100% - 22px, 1180px);
          }

          .landing-nav-inner {
            min-height: 66px;
          }

          .landing-nav-actions .landing-btn-secondary {
            display: none;
          }

          .landing-title {
            font-size: clamp(2.65rem, 14vw, 4.5rem);
          }

          .landing-features-grid,
          .landing-tutorial-grid,
          .landing-product-stats {
            grid-template-columns: 1fr;
          }

          .landing-product-map {
            height: 220px;
          }

          .landing-hero-actions .landing-btn {
            width: 100%;
          }

          .landing-section {
            padding: 62px 0;
          }
        }
      `}</style>

      <nav className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <button
            type="button"
            className="landing-brand"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}
          >
            <span className="landing-brand-mark">AG</span>
            <span className="landing-brand-copy">
              <strong>AgroMind CR</strong>
            </span>
          </button>

          <div className="landing-nav-actions">
            {!hasSession && (
              <button
                type="button"
                className="landing-btn landing-btn-secondary"
                onClick={openLogin}
              >
                Iniciar sesión
              </button>
            )}

            <button
              type="button"
              className="landing-btn landing-btn-primary"
              onClick={hasSession ? onOpenAccount : openRegister}
            >
              {hasSession ? "Ir a mis fincas" : "Crear mi cuenta"}
            </button>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-container landing-hero-grid">
          <div>
            <span className="landing-eyebrow">
              Tecnología agropecuaria creada en Costa Rica para el mundo
            </span>

            <h1 className="landing-title">
              Tu operación agropecuaria, <span>bajo control.</span>
            </h1>

            <p className="landing-lead">
              AgroMind es el asistente digital que reúne fincas, mapas, tareas,
              procesos, clima, finanzas e indicadores en una sola plataforma.
              Administrá varias fincas, trabajá con consultores mediante accesos
              controlados y contá con soporte 24/7 cuando lo necesités.
            </p>

            <div className="landing-hero-actions">
              <button
                type="button"
                className="landing-btn landing-btn-primary"
                onClick={hasSession ? onOpenAccount : openRegister}
              >
                {hasSession ? "Ir a mis fincas" : "Crear mi cuenta"}
              </button>

              {!hasSession && (
                <button
                  type="button"
                  className="landing-btn landing-btn-secondary"
                  onClick={openLogin}
                >
                  Iniciar sesión
                </button>
              )}
            </div>

            <div className="landing-proof">
              <span>✓ Gestión multifinca</span>
              <span>✓ Consultores con acceso controlado</span>
              <span>✓ Acompañamiento y soporte 24/7</span>
            </div>
          </div>

          <div className="landing-product-frame" aria-label="Vista previa de AgroMind">
            <div className="landing-product-toolbar">
              <div className="landing-product-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="landing-product-chip">Finca El Roble · Activa</span>
            </div>

            <div className="landing-product-map">
              <img
                src="/mapas.PNG"
                alt="Mapa real de una finca organizado en AgroMind CR"
              />
            </div>

            <div className="landing-product-stats">
              <div className="landing-mini-card">
                <span>Zonas</span>
                <strong>12</strong>
              </div>
              <div className="landing-mini-card">
                <span>Tareas activas</span>
                <strong>18</strong>
              </div>
              <div className="landing-mini-card">
                <span>Procesos</span>
                <strong>7</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="funciones">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Una operación conectada de principio a fin.</h2>
            <p>
              Cada módulo comparte la misma finca, las mismas zonas y el mismo
              contexto operativo. La información deja de vivir en islas.
            </p>
          </div>

          <div className="landing-features-grid">
            {features.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="tutoriales">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Aprendé AgroMind a tu ritmo.</h2>
            <p>
              Esta sección queda preparada para publicar tutoriales, demostraciones,
              capacitaciones y novedades del producto.
            </p>
          </div>

          <div className="landing-tutorial-grid">
            {tutorials.map((tutorial) => (
              <article key={tutorial.title} className="landing-tutorial-card">
                <div className="landing-video-placeholder">
                  <span className="landing-play">▶</span>
                </div>
                <div className="landing-tutorial-copy">
                  <h3>{tutorial.title}</h3>
                  <p>{tutorial.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-purpose" id="proposito">
        <div className="landing-container landing-purpose-grid">
          <div className="landing-purpose-intro">
            <span className="landing-purpose-kicker">Nuestro propósito</span>
            <h2>Tecnología del campo, creada para llegar más lejos.</h2>
            <p>
              AgroMind nace para acompañar a productores, ganaderos, agricultores,
              ingenieros, consultores y equipos que necesitan transformar el trabajo
              diario en una operación más ordenada, conectada y rentable.
            </p>
          </div>

          <div className="landing-purpose-cards">
            <article className="landing-purpose-card">
              <strong>Nuestra misión</strong>
              <p>
                Facilitar la gestión agropecuaria mediante una plataforma accesible
                que conecte el trabajo de campo, la administración y la toma de decisiones.
              </p>
            </article>

            <article className="landing-purpose-card">
              <strong>Nuestra visión</strong>
              <p>
                Construir desde Costa Rica un ecosistema tecnológico para el sector
                agropecuario del mundo, capaz de integrar fincas, equipos de trabajo,
                maquinaria, dispositivos y datos productivos en una operación cada vez
                más conectada, eficiente y rentable.
              </p>
              <div className="landing-future-note">
                Nuestra evolución contempla nuevas integraciones con dispositivos,
                maquinaria y tecnologías para el campo. Estas capacidades forman parte
                de la visión futura de AgroMind CR.
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta-card">
            <div>
              <h2>Tu finca ya genera datos. Es hora de convertirlos en dirección.</h2>
              <p>AgroMind CR: más que software, un aliado estratégico.</p>
            </div>

            <button
              type="button"
              className="landing-btn landing-btn-primary"
              onClick={hasSession ? onOpenAccount : openRegister}
            >
              {hasSession ? "Ir a mis fincas" : "Crear mi cuenta"}
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <span>© {new Date().getFullYear()} AgroMind CR.</span>
          <span>Construido para una actividad agropecuaria más clara, conectada y rentable.</span>
        </div>
      </footer>
    </main>
  );
}
