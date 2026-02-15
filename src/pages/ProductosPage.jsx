import "../styles/productos.css";

export default function ProductosPage() {
  return (
    <div className="productos-page">
      <header className="productos-header">
        <h2>Productos de interés</h2>
        <p>
          Recomendaciones inteligentes basadas en los cultivos de tu finca.
        </p>
      </header>

      <section className="productos-intro">
        <p>
          AgroMind analiza la información productiva de tu finca y te sugiere
          insumos agrícolas adecuados para mejorar rendimiento, sanidad y
          eficiencia.
        </p>
        <p className="productos-note">
          Demo conceptual · La conexión a inventarios reales se habilitará en
          fases futuras.
        </p>
      </section>

      <section className="productos-grid">
        <div className="producto-card">
          <h3>Trichoderma harzianum</h3>
          <p><strong>Tipo:</strong> Bioinsumo orgánico</p>
          <p><strong>Uso:</strong> Control de hongos del suelo</p>
          <p><strong>Precio estimado:</strong> ₡8.500</p>
          <p><strong>Proveedor:</strong> AgroServicios del Norte</p>
          <p><strong>Ubicación:</strong> Ciudad Quesada</p>
        </div>
      </section>
    </div>
  );
}
