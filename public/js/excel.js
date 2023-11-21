

function procesarExcel() {
  const inventarioFile = document.getElementById("inventario").files[0];
  const ventasFile = document.getElementById("ventas").files[0];

  if (!inventarioFile || !ventasFile) {
    return false;
  }

  // Procesar los archivos con exceljs
  const workbookInventario = new ExcelJS.Workbook();
  workbookInventario.xlsx.load(inventarioFile.buffer).then((workbook) => {
    const dataInventario = loadDataFromWorksheet(
      workbookInventario.getWorksheet(1)
    );
  });

  const workbookVentas = new ExcelJS.Workbook();
  workbookVentas.xlsx.load(ventasFile.buffer).then((workbook) => {
    const dataVentas = loadDataFromWorksheet(
      workbookVentas.getWorksheet(1)
    );
  });

  if(!dataInventario == !dataVentas){
    alert("se proceso de manera correcta los excel");
  }
}
function loadDataFromWorksheet(worksheet) {
  // ... (sin cambios en esta función)
}


