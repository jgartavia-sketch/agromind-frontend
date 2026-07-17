import { useEffect } from "react";

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const features = [
  {
    number: "01",
    title: "Entiende tu finca de un vistazo",
    text: "Ubica zonas, cultivos, infraestructura, componentes y evidencias en un mapa construido alrededor de tu realidad.",
  },
  {
    number: "02",
    title: "Convierte el trabajo en seguimiento",
    text: "Coordina tareas, procesos, responsables y fechas sin depender de papeles, chats dispersos o de la memoria.",
  },
  {
    number: "03",
    title: "Ordena cada proceso productivo",
    text: "Documenta etapas, registra avances y conserva una historia operativa que mejora con cada ciclo.",
  },
  {
    number: "04",
    title: "Decide con datos reales",
    text: "Reúne indicadores, finanzas y actividad reciente para tomar decisiones con contexto, no con suposiciones.",
  },
];

const tutorials = [
  {
    title: "Primeros pasos en AgroMind",
    text: "Crea tu primera finca y configura el espacio de trabajo.",
  },
  {
    title: "Mapa y zonas productivas",
    text: "Representa tu finca y organiza sus áreas productivas.",
  },
  {
    title: "Tareas y procesos",
    text: "Planifica actividades, responsables y procesos agrícolas.",
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
          background: #07110d;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .landing-container {
          width: min(1200px, calc(100% - 40px));
          margin: 0 auto;
        }

        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(148,163,184,0.12);
          background: rgba(7,17,13,0.88);
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
          border-radius: 50%;
          border: 1px solid rgba(34,197,94,0.30);
          background: linear-gradient(135deg, rgba(34,197,94,0.24), rgba(20,184,166,0.10));
          color: #bbf7d0;
          font-size: 0.82rem;
          font-weight: 950;
          letter-spacing: 0.06em;
          box-shadow: 0 0 34px rgba(34,197,94,0.13);
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
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, filter 160ms ease;
        }

        .landing-btn:hover {
          transform: translateY(-1px);
        }

        .landing-btn-primary {
          border-color: rgba(34,197,94,0.38);
          background: #22a65a;
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
          padding: clamp(70px, 9vw, 118px) 0 96px;
          border-bottom: 1px solid rgba(226,232,240,0.08);
          background:
            linear-gradient(90deg, rgba(7,17,13,0.98) 0%, rgba(7,17,13,0.87) 50%, rgba(7,17,13,0.40) 100%),
            radial-gradient(circle at 88% 42%, rgba(68,160,91,0.30), transparent 35%),
            linear-gradient(145deg, #102b1e, #07110d 62%);
        }

        .landing-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
          gap: clamp(38px, 6vw, 76px);
          align-items: center;
        }

        .landing-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 0;
          padding-left: 0;
          background: transparent;
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
          font-size: clamp(2.8rem, 6vw, 5.25rem);
          line-height: 1.01;
          letter-spacing: -0.055em;
        }

        .landing-title span {
          color: #78d996;
          text-shadow: none;
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
          border-radius: 18px;
          border: 1px solid rgba(34,197,94,0.20);
          background:
            radial-gradient(circle at 20% 0%, rgba(34,197,94,0.18), transparent 34%),
            linear-gradient(145deg, rgba(15,23,42,0.98), rgba(2,6,23,0.96));
          box-shadow: 0 30px 70px rgba(0,0,0,0.38);
          transform: rotate(1deg);
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
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(148,163,184,0.14);
          background:
            linear-gradient(35deg, transparent 48%, rgba(56,189,248,0.18) 49%, rgba(56,189,248,0.18) 51%, transparent 52%),
            linear-gradient(-20deg, transparent 46%, rgba(34,197,94,0.18) 47%, rgba(34,197,94,0.18) 52%, transparent 53%),
            radial-gradient(circle at 70% 35%, rgba(34,197,94,0.26), transparent 14%),
            linear-gradient(135deg, #17361f, #10281d 38%, #0d1f1b 70%, #142b22);
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
          border-radius: 18px;
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
          padding: 104px 0;
        }

        .landing-section-header {
          max-width: 720px;
          margin-bottom: 32px;
        }

        .landing-section-header h2 {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(2.1rem, 4vw, 3.8rem);
          letter-spacing: -0.05em;
        }

        .landing-section-header p {
          margin: 16px 0 0;
          color: rgba(203,213,225,0.74);
          line-height: 1.7;
        }

        .landing-features-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
          border-top: 1px solid rgba(226,232,240,0.14);
        }

        .landing-feature-card {
          min-height: 270px;
          padding: 30px 26px 20px;
          border-radius: 0;
          border: 0;
          border-right: 1px solid rgba(226,232,240,0.10);
          background: transparent;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .landing-feature-card:hover {
          transform: translateY(-4px);
          background: rgba(255,255,255,0.025);
          box-shadow: none;
        }

        .landing-feature-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          width: auto;
          height: auto;
          display: block;
          border: 0;
          background: transparent;
          color: #67c787;
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.12em;
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
          gap: 16px;
        }

        .landing-tutorial-card {
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.13);
          background: rgba(15,23,42,0.56);
        }

        .landing-video-placeholder {
          position: relative;
          aspect-ratio: 16 / 9;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 50% 50%, rgba(34,197,94,0.18), transparent 34%),
            linear-gradient(135deg, #10271c, #07111f);
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
          box-shadow: 0 0 38px rgba(34,197,94,0.18);
        }

        .landing-video-label {
          position: absolute;
          left: 16px;
          top: 16px;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(7,17,13,0.78);
          color: #bbf7d0;
          font-size: 0.68rem;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .landing-collaboration {
          background: #edf4ec;
          color: #13261a;
        }

        .landing-collaboration-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: clamp(40px, 8vw, 100px);
          align-items: center;
        }

        .landing-collaboration h2 {
          margin: 0;
          color: #102419;
          font-size: clamp(2.2rem, 4vw, 4rem);
          line-height: 1.04;
          letter-spacing: -0.055em;
        }

        .landing-collaboration p {
          color: #496052;
          line-height: 1.75;
        }

        .landing-access-list {
          display: grid;
          gap: 12px;
        }

        .landing-access-item {
          padding: 19px 0;
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 16px;
          border-bottom: 1px solid rgba(16,36,25,0.14);
        }

        .landing-access-item strong,
        .landing-access-item span { display: block; }
        .landing-access-item strong { color: #183e27; }
        .landing-access-item span { margin-top: 5px; color: #5b6d61; line-height: 1.55; }
        .landing-access-number { color: #229551; font-weight: 900; }

        .landing-trust {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 34px;
        }

        .landing-trust-block {
          padding: 24px;
          border-left: 2px solid #32b867;
          background: rgba(255,255,255,0.035);
        }

        .landing-trust-block strong { display: block; color: #f8fafc; }
        .landing-trust-block span { display: block; margin-top: 7px; color: rgba(203,213,225,0.70); line-height: 1.55; }

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

        .landing-cta-card {
          padding: clamp(30px, 6vw, 64px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          border-radius: 32px;
          border: 1px solid rgba(34,197,94,0.24);
          background:
            radial-gradient(circle at 8% 0%, rgba(34,197,94,0.22), transparent 34%),
            radial-gradient(circle at 90% 10%, rgba(20,184,166,0.16), transparent 28%),
            linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.96));
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

          .landing-features-grid { grid-template-columns: 1fr 1fr; }
          .landing-collaboration-grid { grid-template-columns: 1fr; }

          .landing-cta-card {
            align-items: flex-start;
            flex-direction: column;
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

          .landing-trust { grid-template-columns: 1fr; }
          .landing-feature-card { min-height: auto; border-right: 0; border-bottom: 1px solid rgba(226,232,240,0.10); }

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
              {hasSession ? "Ir a mis fincas" : "Crear cuenta"}
            </button>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-container landing-hero-grid">
          <div>
            <span className="landing-eyebrow">Tecnología agrícola desde Costa Rica</span>

            <h1 className="landing-title">
              Tu finca tiene una historia. <span>AgroMind la convierte en dirección.</span>
            </h1>

            <p className="landing-lead">
              Reúne el mapa, las tareas, los procesos, el clima y los números de tu
              operación en un solo lugar. Para trabajar con orden hoy y decidir mejor mañana.
            </p>

            <div className="landing-hero-actions">
              <button
                type="button"
                className="landing-btn landing-btn-primary"
                onClick={hasSession ? onOpenAccount : openRegister}
              >
                {hasSession ? "Abrir mi espacio" : "Comenzar ahora"}
              </button>

              {!hasSession && (
                <button
                  type="button"
                  className="landing-btn landing-btn-secondary"
                  onClick={openLogin}
                >
                  Ya tengo una cuenta
                </button>
              )}
            </div>

            <div className="landing-proof">
              <span>✓ Varias fincas, una sola cuenta</span>
              <span>✓ Consultores con acceso controlado</span>
              <span>✓ Soporte cuando lo necesités</span>
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
              <span className="landing-zone landing-zone-one" />
              <span className="landing-zone landing-zone-two" />
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
            <h2>Del terreno a la decisión, sin perder el hilo.</h2>
            <p>
              AgroMind conecta lo que pasa en el campo con lo que necesitás saber
              para dirigir la operación. Cada registro suma contexto y reduce improvisación.
            </p>
          </div>

          <div className="landing-features-grid">
            {features.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-icon">{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-collaboration">
        <div className="landing-container landing-collaboration-grid">
          <div>
            <span className="landing-eyebrow" style={{ color: "#23834a" }}>Hecho para trabajar en equipo</span>
            <h2>Tu operación crece. El control también.</h2>
            <p>
              Administrá varias fincas desde una sola cuenta e incorporá consultores
              sin entregarles las llaves de toda la operación. Cada persona ve lo necesario.
            </p>
          </div>

          <div className="landing-access-list">
            <div className="landing-access-item">
              <span className="landing-access-number">01</span>
              <div><strong>Gestión multifinca</strong><span>Cambiá de finca sin mezclar mapas, tareas, procesos ni información financiera.</span></div>
            </div>
            <div className="landing-access-item">
              <span className="landing-access-number">02</span>
              <div><strong>Consultoría con límites claros</strong><span>Invitá profesionales con una vista controlada y mantené la administración bajo tu mando.</span></div>
            </div>
            <div className="landing-access-item">
              <span className="landing-access-number">03</span>
              <div><strong>Información que permanece</strong><span>Construí una memoria operativa útil para la próxima temporada, el próximo equipo y la próxima decisión.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="tutoriales">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Aprendé AgroMind a tu ritmo.</h2>
            <p>
              Muy pronto encontrarás aquí guías breves conectadas con nuestro canal de YouTube.
              Sin manuales eternos: mirás, aplicás y seguís trabajando.
            </p>
          </div>

          <div className="landing-tutorial-grid">
            {tutorials.map((tutorial) => (
              <article key={tutorial.title} className="landing-tutorial-card">
                <div className="landing-video-placeholder">
                  <span className="landing-video-label">Próximamente en YouTube</span>
                  <span className="landing-play">▶</span>
                </div>
                <div className="landing-tutorial-copy">
                  <h3>{tutorial.title}</h3>
                  <p>{tutorial.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="landing-trust">
            <div className="landing-trust-block">
              <strong>No estás solo frente a la plataforma</strong>
              <span>Te acompañamos con soporte 24/7 para que una duda no detenga el trabajo de tu finca.</span>
            </div>
            <div className="landing-trust-block">
              <strong>Creado desde Costa Rica para el trabajo real</strong>
              <span>Una herramienta que entiende que la agricultura sucede en movimiento, no detrás de un escritorio.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta-card">
            <div>
              <h2>El futuro de tu finca empieza con ordenar lo que sucede hoy.</h2>
              <p>Creá tu espacio y comenzá a construir una operación más clara, conectada y rentable.</p>
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
          <span>Construido para una agricultura más clara, conectada y rentable.</span>
        </div>
      </footer>
    </main>
  );
}
