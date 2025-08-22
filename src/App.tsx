const App = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Financeiro Unirad</h1>
      <p>Sistema avançado para comparação e processamento de planilhas financeiras</p>
      <div style={{ 
        padding: '20px', 
        border: '1px solid #ccc', 
        borderRadius: '8px',
        marginTop: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <h2>Modelo 1 - Conversão Otimus → Referência</h2>
        <p>Converte arquivo gerado do Otimus para a referência com tratamento de dados específico</p>
        <button style={{
          padding: '10px 20px',
          backgroundColor: '#22c55e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          Em desenvolvimento...
        </button>
      </div>
    </div>
  );
};

export default App;
