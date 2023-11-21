const express = require("express");
const path = require("path");
const morgan = require("morgan");
const app = express();
const port = 4000;

const ExcelJS = require("exceljs");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static("public"));
app.use(morgan("dev"));

// Configurar el motor de vistas ejs
app.set("view engine", "ejs");
app.set("views", path.join("views")); // Asegúrate de tener una carpeta "views" en tu proyecto

app.get("/", (req, res) => {
  res.render("inicio");
});

app.get("/index", (req, res) => {
  res.render("index");
});

app.get("/inicio", (req, res) => {
  res.render("inicio");
});

// Variable de aplicación para almacenar los datos procesados
let processedData = null;

app.get("/duracion", (req, res) => {
  if (processedData) {
    res.render("duracion", { data: processedData });
  } else {
    res.status(404).send("No hay datos procesados disponibles.");
  }
});

app.get("/cantidadCompra", (req, res) => {
  if (processedData) {
    res.render("cantidadCompra", { data: processedData });
  } else {
    res.status(404).send("No hay datos procesados disponibles.");
  }
});

app.get("/productosPedir", (req, res) => {
  if (processedData) {
    res.render("productosPedir", { data: processedData });
  } else {
    res.status(404).send("No hay datos procesados disponibles.");
  }
});

app.get("/sobrestockeado", (req, res) => {
  if (processedData) {
    res.render("sobrestockeado", { data: processedData });
  } else {
    res.status(404).send("No hay datos procesados disponibles.");
  }
});

app.use(express.json());

app.post("/generar-archivo", (req, res) => {
  // Crear un nuevo libro de Excel
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Productos Seleccionados");

  // Encabezados
  worksheet.addRow(["Producto", "Duración"]);

  // Agregar filas para cada producto
  req.body.forEach((product) => {
    worksheet.addRow([product.product, product.duration]);
  });

  // Crear el archivo Excel
  workbook.xlsx
    .writeBuffer()
    .then((buffer) => {
      // Enviar el archivo al cliente
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=productos_seleccionados.xlsx"
      );
      res.end(Buffer.from(buffer)); // Use res.end() instead of res.send()
    })
    .catch((error) => {
      console.error("Error al generar el archivo Excel:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Error al generar el archivo Excel.",
        });
    });
});

function loadDataFromWorksheet(worksheet) {
  const data = [];

  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Obtén el nombre de la columna (A, B, C, etc.)
      const columnName = String.fromCharCode(64 + colNumber);
      rowData[columnName] = cell.value;
    });
    data.push(rowData);
  });

  return data;
}

app.post(
  "/procesar-excel",
  upload.fields([
    { name: "inventario", maxCount: 1 },
    { name: "ventas", maxCount: 1 },
  ]),
  (req, res) => {
    const inventarioFile = req.files["inventario"][0];
    const ventasFile = req.files["ventas"][0];
    if (!inventarioFile || !ventasFile) {
      return res.status(400).send("No se seleccionaron ambos archivos.");
    }

    const workbookInventario = new ExcelJS.Workbook();
    const workbookVentas = new ExcelJS.Workbook();

    workbookInventario.xlsx
      .load(inventarioFile.buffer)
      .then(() => {
        return workbookVentas.xlsx.load(ventasFile.buffer);
      })
      .then(() => {
        const dataInventario = loadDataFromWorksheet(
          workbookInventario.getWorksheet(1)
        );
        const dataVentas = loadDataFromWorksheet(
          workbookVentas.getWorksheet(1)
        );

        // Verificar si dataInventario y dataVentas son definidos y no son null
        if (!dataInventario || !dataVentas) {
          console.error("Error al cargar los datos del archivo Excel.");
          return res
            .status(500)
            .send("Error al cargar los datos del archivo Excel.");
        }

        const productosComunes = [
          ...new Set(
            dataInventario
              .map((row) => row.A)
              .concat(dataVentas.map((row) => row.A))
          ),
        ];

        let tableData = [];
        productosComunes.forEach((producto) => {
          const inventarioRow =
            dataInventario.find((row) => row.A === producto) || {};
          const ventasRow = dataVentas.find((row) => row.A === producto) || {};

          if (inventarioRow && ventasRow) {
            const inventarioB = inventarioRow.B || 0;
            const ventasB = ventasRow.B || 0;
            const VentaXmes = ventasB / 9;
            const DuracionStock = inventarioB / VentaXmes;
            const CantidadComprar = VentaXmes * 3;
            const CantComprar = CantidadComprar - inventarioB;
            const estado = DuracionStock > 3 ? "No Pedir" : "Pedir";
            const sobrestockeado = DuracionStock > 6 ? "Sobrestockeado" : " ";

            tableData.push({
              producto: producto || "", // Usa el nombre del producto directamente
              inventario: inventarioB || 0,
              ventas: ventasB || 0,
              duracion: DuracionStock,
              cantidadComprar: CantComprar,
              estado: estado,
              sobrestockeado : sobrestockeado,
            });
          }
        });
        processedData = tableData.filter(
          (row) => !isNaN(row.duracion) && isFinite(row.duracion)
        );
        // Renderizar la vista con los datos de la tabla
        res.render("tabla", { tableData: tableData });
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error al procesar los archivos Excel.");
      });
  }
);

app.listen(port, () => {
  console.log(`La aplicación está escuchando en http://localhost:${port}`);
});
