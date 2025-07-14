const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mysql = require('mysql2');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let client = null;   // cliente WhatsApp
const usuariosEnAsesor = new Set();

// ✅ Conexión a MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chatbot_db'
});

db.connect(err => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err);
    } else {
        console.log('✅ Conectado a MySQL');
    }
});
// 🧹 Borrar mensajes antiguos cada hora
setInterval(() => {
    db.query(
        'DELETE FROM mensajes WHERE fecha < NOW() - INTERVAL 1 DAY',
        (err, result) => {
            if (err) {
                console.error('❌ Error eliminando mensajes antiguos:', err);
            } else {
                console.log(`🧹 Mensajes antiguos eliminados (${result.affectedRows})`);
            }
        }
    );
}, 60 * 60 * 1000);

// 📡 Eventos desde la web
io.on('connection', (socket) => {
    console.log('💻 Cliente web conectado');

    socket.on('iniciar', () => {
        console.log('⚙️ Cliente web pidió iniciar bot');
        if (!client) {
            initWhatsAppClient();
        } else {
            console.log('✅ Bot ya estaba iniciado');
        }
    });

    socket.on('cerrar', () => {
        console.log('🛑 Cliente web pidió cerrar bot');
        if (client) {
            client.destroy();
            client = null;
            io.emit('disconnected', 'Bot detenido manualmente desde la web');
            console.log('✅ Bot detenido');
        } else {
            console.log('⚠️ Bot ya estaba detenido');
        }
    });
});

// 📱 Inicializar cliente WhatsApp
function initWhatsAppClient() {
    client = new Client({
        authStrategy: new LocalAuth(),
    });

    client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
        io.emit('qr', qr);
    });

    client.on('ready', () => {
        console.log('✅ Bot listo');
        io.emit('ready');
    });

    client.on('authenticated', () => {
        console.log('🔐 Bot autenticado');
        io.emit('authenticated');
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ Error de autenticación:', msg);
        io.emit('auth_failure', msg);
    });

    client.on('disconnected', (reason) => {
        console.warn('⚠️ Bot desconectado:', reason);
        io.emit('disconnected', reason);
        client = null;
    });

    // ✅ Guardar cada mensaje en MySQL
    client.on('message', async (message) => {
        console.log('📨 Mensaje:', message.body);
        const numero = message.from;

        db.query(
            'INSERT INTO mensajes (numero, mensaje) VALUES (?, ?)',
            [numero, message.body],
            (err, result) => {
                if (err) {
                    console.error('❌ Error insertando mensaje:', err);
                } else {
                    console.log('✅ Mensaje guardado en la base');
                }
            }
        );
            if (usuariosEnAsesor.has(numero)) {
                if (message.body.toLowerCase().includes('volver al bot')) {
                    usuariosEnAsesor.delete(numero);
                    client.sendMessage(numero, "🤖 ¡Has vuelto con el asistente automático!\nEscribe `0` para ver el menú principal.");
                    io.emit('estadoBot', numero);
                } else {
                    io.emit('message', `💬 [HUMANO] ${numero}: ${message.body}`);
                }
                return;
            }

            io.emit('message', `🤖 [BOT] ${numero}: ${message.body}`);

            if (message.body.trim() === '4') {
                usuariosEnAsesor.add(numero);
                client.sendMessage(numero, "🧑‍💼 *Has sido derivado a un asesor humano.*\no escribe *volver al bot*\nPor favor, espera mientras te contactamos.");
                io.emit('estadoHumano', numero);
                return;
            }
            if (message.body.trim() === '33') {
                usuariosEnAsesor.add(numero);
                client.sendMessage(numero, "🧑‍💼 *❓ *Otro problema técnico* – Cuéntanos qué sucede y te apoyaremos lo antes posible.\nPor favor, espera mientras te contactamos.\no escribe *volver al bot*");
                io.emit('estadoHumano', numero);
                return;
            }

            if (message.body.trim() === '5') {
                client.sendMessage(numero, "👋 *Gracias por contactar. Hasta pronto!* 😊");
                return;
            }

            // 📷 categoria-1
            if (message.body.trim() === '11') {
                try {
                    // Producto 1
                    const media1 = await MessageMedia.fromFilePath('productos/Adaptador-SC-UPC-SM-Simplex.png');
                    await client.sendMessage(numero, media1);
                    await client.sendMessage(numero,
                        "*📡 Adaptador SC/UPC monomodo simplex con brida*\n" +
                        "💰 Precio: S/ 9.90\n" +
                        "📦 Adaptador SC/UPC monomodo simplex con brida para conexiones precisas y seguras en redes de fibra óptica.\n" +
                        "🔗 Más detalles: https://mitienda.com/productos/adaptador-sc-upc"
                    );

                    // Producto 2
                    const media2 = await MessageMedia.fromFilePath('productos/adaptador-duplex.png');
                    await client.sendMessage(numero, media2);
                    await client.sendMessage(numero,
                        "*📡 Adaptador LC/UPC monomodo dúplex con brida*\n" +
                        "💰 Precio: S/ 12.50\n" +
                        "📦 Adaptador LC/UPC monomodo dúplex con brida, ideal para conexiones de alta densidad.\n" +
                        "🔗 Más detalles: https://mitienda.com/productos/adaptador-lc-upc"
                    );

                    // Producto 3

                    // Al final, recordatorio
                     await client.sendMessage(numero, "✏️ Escribe `0` para regresar al menú"+
                        " O escribe *4* para hablar con un asesor humano.");
                } catch (error) {
                    console.error('❌ Error al enviar imágenes de productos:', error);
                    await client.sendMessage(numero, "⚠️ Hubo un problema al enviar la información de los productos.");
                }
                return;
            }

           // 📷categoria-2
            if (message.body.trim() === '12') {
                try {
                    // Producto 1: Caja NAP 1x16 SC/APC
                    const media1 = await MessageMedia.fromFilePath('productos/caja-nap2.png');
                    await client.sendMessage(numero, media1);
                    await client.sendMessage(numero,
                        "*📡 CAJA DE DISTRIBUCIÓN 1×16 SC/APC (WL-TX2-16C)*\n" +
                        "💰 Precio: S/ 73.40\n" +
                        "📦 Diseñada para manejar hasta 16 conexiones SC/APC, resistente al agua y de fácil instalación.\n" +
                        "🔗 Más detalles: https://mitienda.com/productos/caja-nap-1x16"
                    );

                    // Producto 2: Caja NAP 1x8 SC/APC
                    const media2 = await MessageMedia.fromFilePath('productos/caja-nap-1x8.png');
                    await client.sendMessage(numero, media2);
                    await client.sendMessage(numero,
                        "*📦 Caja NAP de distribución 1×8 SC/APC*\n" +
                        "💰 Precio: S/ 49.90\n" +
                        "📦 Ideal para redes FTTH, capacidad para 8 adaptadores SC/APC.\n" +
                        "🔗 Más detalles: https://mitienda.com/productos/caja-nap-1x8"
                    );

                    // Producto 3: Caja NAP 1x4 SC/APC
                    const media3 = await MessageMedia.fromFilePath('productos/CAJA-NAP-1-4-1.png');
                    await client.sendMessage(numero, media3);
                    await client.sendMessage(numero,
                        "*📦 Caja NAP de distribución 1×4 SC/APC*\n" +
                        "💰 Precio: S/ 32.50\n" +
                        "📦 Compacta y fácil de instalar, protege y distribuye hasta 4 fibras ópticas.\n" +
                        "🔗 Más detalles: https://mitienda.com/productos/caja-nap-1x4"
                    );

                    // Mensaje final
                     await client.sendMessage(numero, "✏️ Escribe `0` para regresar al menú"+
                        " O escribe *4* para hablar con un asesor humano.");
                } catch (error) {
                    console.error('❌ Error al enviar imágenes de productos:', error);
                    await client.sendMessage(numero, "⚠️ Hubo un problema al enviar la información de las cajas NAP.");
                }
                return;
            }

           // 📦 categoria-3: ODFs
            if (message.body.trim() === '13') {
                try {
                    // Producto 1: 
                    const media1 = await MessageMedia.fromFilePath('productos/odf-24.png');
                    await client.sendMessage(numero, media1);
                    await client.sendMessage(numero,
                        "*📦 ODF 1U, 24 Puertos, con 24 adaptadores SC/APC SM simplex, sin pigtails*\n" +
                        "💰 Precio: S/ 129.90\n" +
                        "📦 Organiza y protege conexiones ópticas en redes FTTH y centros de datos\".\n" +
                        "🔗 Más detalles: https://mitienda.com/productos/odf-12p-scupc"
                    );

                    // Producto 2:
                    const media2 = await MessageMedia.fromFilePath('productos/odf-48.png');
                    await client.sendMessage(numero, media2);
                    await client.sendMessage(numero,
                        "*📦 ODF de 2U con 48 puertos, equipado con 48 adaptadores SC/APC monomodo simplex preinstalados*\n" +
                        "💰 Precio: S/ 189.90\n" +
                        "📦 ODF de 2U con capacidad para 48 fibras, incluye 48 adaptadores SC/APC monomodo simplex preinstalados. Ideal para gestión ordenada y protección de conexiones en redes FTTH.\n" +
                        "🔗 Más detalles: https://mitienda.com/productos/odf-24p-scupc"
                    );

                    /* Producto 3: ODF 48 puertos SC/APC
                    const media3 = await MessageMedia.fromFilePath('productos/odf-48p-scapc.png');
                    await client.sendMessage(numero, media3);
                    await client.sendMessage(numero,
                        "*📦 ODF 48 puertos SC/APC tipo rack 2U*\n" +
                        "💰 Precio: S/ 299.90\n" +
                        "📦 Mayor capacidad de distribución, con puertas frontales y bandeja extraíble.\n" +
                        "🔗 Más detalles: https://mitienda.com/productos/odf-48p-scapc"
                    );*/

                    // Mensaje final
                    await client.sendMessage(numero, "✏️ Escribe `0` para regresar al menú"+
                        " O escribe *4* para hablar con un asesor humano.");
                } catch (error) {
                    console.error('❌ Error al enviar imágenes de ODFs:', error);
                    await client.sendMessage(numero, "⚠️ Hubo un problema al enviar la información de los ODFs.");
                }
                return;
            }

            // 📷 categoria-5
            if (message.body.trim() === '15') {
                try {
                    const media = await MessageMedia.fromFilePath('productos/cj-nap.png');
                    await client.sendMessage(numero, media);
                    await client.sendMessage(numero,
                        "*📡 Router Wi-Fi*\n" +
                        "💰 Precio: S/ 99.90\n" +
                        "📦 Cobertura estable en todo tu hogar. Ideal para múltiples dispositivos.\n\n" +
                        "Escribe `0` para regresar al menú."
                    );
                } catch (error) {
                    console.error('❌ Error al enviar imagen del router:', error);
                    await client.sendMessage(numero, "⚠️ Hubo un problema al enviar la información del router Wi-Fi.");
                }
                return;
            }

            const respuesta = getResponse(message.body);
            if (respuesta) {
                client.sendMessage(numero, respuesta)
                    .then(() => io.emit('message', `🤖 Bot: ${respuesta}`))
                    .catch(err => {
                        console.error('❌ Error al enviar:', err);
                        io.emit('message', 'Error enviando respuesta.');
                    });
            }
        });

        client.initialize();
 }


function getResponse(messageBody) {
    let respuesta = '';

    switch (true) {
        // Menú principal
        case /hola|holaa|respondan|responder|que tal|como estan|Cómo estas|quiero saber|productos|servicios|soporte|ayuda|problema|información/i.test(messageBody):
           respuesta = "🌟 *¡Hola! Bienvenido a Rutel Comunicaciones* 🌟\n\n" +
                "Soy tu *asistente virtual* 🤖. Elige una opción escribiendo el número correspondiente:\n\n" +
                "1️⃣ *Ver nuestros productos*\n" +
                "2️⃣ *Descubrir nuestros servicios*\n" +
                "3️⃣ *Necesito soporte técnico*\n" +
                "4️⃣ *Quiero un asesor humano*\n" +
                "5️⃣ *Salir del chat*\n\n" +
                "💬 *Ejemplo:* escribe `1` para conocer nuestros productos.";
            break;

        // Opción 1 – Productos
        case messageBody === '1':
            respuesta = "🛍️ *Nuestros Productos Estrella* 🛍️\n\n" +
                        "Selecciona una subopción para más detalles:\n\n" +
                        "1️⃣1️⃣ *Adaptadores*\n" +
                        "1️⃣2️⃣ *Caja Nat De Distribucion*\n" +
                        "1️⃣3️⃣ *ODFs*\n" +
                        "1️⃣4️⃣ *Módem portátil*\n\n" +
                        "🔙 Escribe `0` para regresar al menú principal.";
            break;
        //caso11
        //caso12
        //caso13
        //caso14
        //caso15
        //caso16

        // Opción 2 – Servicios
        case messageBody === '2':
            respuesta = "💼 *Nuestros Servicios* 💼\n\n" +
                        "Selecciona una subopción para saber más:\n\n" +
                        "2️⃣1️⃣ *Planes de Internet*\n" +
                        "2️⃣2️⃣ *Instalación de cámaras de seguridad*\n\n" +
                        "🔙 Escribe `0` para volver al menú principal.";
            break;

        // Servicios – Planes de Internet
        case messageBody === '21':
            respuesta = "🌐 *Planes de Internet* 🌐\n\n" +
                        "Elige uno de nuestros planes disponibles:\n\n" +
                        "2️⃣1️⃣1️⃣ *Plan Básico (10 Mbps)*\n" +
                        "2️⃣1️⃣2️⃣ *Plan Avanzado (50 Mbps)*\n" +
                        "2️⃣1️⃣3️⃣ *Router Wi-Fi*\n" +
                        "2️⃣1️⃣4️⃣ *Módem portátil*\n\n" +
                        "🔙 Escribe `0` para regresar al menú principal.";
            break;
        case messageBody === '211':
            respuesta = "📶 *Plan Básico (10 Mbps)* – Ideal para tareas básicas.\n💰 Desde S/ 49.90 mensual.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '212':
            respuesta = "🚀 *Plan Avanzado (50 Mbps)* – Para varios dispositivos y streaming.\n💰 Desde S/ 79.90 mensual.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '213':
            respuesta = "📡 *Router Wi-Fi* – Cobertura ampliada para todos los rincones.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '2.1.4':
            respuesta = "📱 *Módem portátil* – Ideal para llevar internet donde lo necesites.\n\nEscribe `0` para regresar al menú.\nO escribe *4* para hablar con un asesor humano.";
            break;

        // Servicios – Cámaras de seguridad
        case messageBody === '22':
            respuesta =  "📷 *Instalación de Cámaras de Seguridad* 📷\n\n" +
                        "Elige una opción para más información:\n\n" +
                        "2️⃣2️⃣1️⃣ *Cámara HD con instalación incluida*\n" +
                        "2️⃣2️⃣2️⃣ *Kit de 4 cámaras + DVR*\n" +
                        "2️⃣2️⃣3️⃣ *Monitoreo remoto desde celular*\n" +
                        "2️⃣2️⃣4️⃣ *Mantenimiento preventivo*\n\n" +
                        "🔙 Escribe `0` para regresar al menú principal.";
            break;
        case messageBody === '221':
            respuesta = "📷 *Cámara HD con instalación incluida*\n"+
            "Vigilancia básica y efectiva.\n"+
            "Incluye garantía y soporte.\n" +
            "🔙 Escribe `0` para regresar al menú principal.\nO escribe *4* para hablar con un asesor humano.";
            break;
        case messageBody === '222':
            respuesta = "📦 *Kit de 4 cámaras + DVR* – Seguridad total para tu hogar o negocio.\nIncluye grabación continua.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '223':
            respuesta = "📱 *Monitoreo remoto desde celular* – Controla tus cámaras desde cualquier lugar.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '224':
            respuesta = "🧰 *Mantenimiento preventivo* – Mantén tu sistema de seguridad en óptimas condiciones.\nIncluye revisión, limpieza y ajustes.\n\nEscribe `0` para regresar al menú.\nO escribe *4* para hablar con un asesor humano.";
            break;

        // Opción 3 – Soporte Técnico
        case messageBody === '3':
            respuesta = "🛠️ *Soporte Técnico* 🛠️\n\n" +
                        "Selecciona una opción:\n\n" +
                        "3️⃣1️⃣ *Problema de conexión a Internet*\n" +
                        "3️⃣2️⃣ *Problema con dispositivos*\n" +
                        "3️⃣3️⃣ *Otro problema técnico*\n\n" +
                        "🔙 Escribe `0` para regresar al menú principal.\nO escribe *4* para hablar con un asesor humano.";
            break;
        case messageBody === '31':
            respuesta = "📡 *Problema de conexión* – Describe el problema (sin señal, lento, etc.) para ayudarte mejor.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '32':
            respuesta = "💻 *Problema con dispositivos* – Indica qué equipo presenta fallas.\n\nEscribe `0` para regresar al menú.";
            break;
        /*case messageBody === '33':
            respuesta = "❓ *Otro problema técnico* – Cuéntanos qué sucede y te apoyaremos lo antes posible.\n\nEscribe `0` para regresar al menú.";
            break;*/

        // Opción 4 – Salida
        case messageBody === '4':
            respuesta = "👋 *Gracias por contactar a Rutel Comunicaciones.*\n¡Hasta pronto! Si necesitas más ayuda, solo escríbeme. 😊";
            break;

        // Volver al menú principal
        case messageBody === '0':
           respuesta = "🌟 *¡Hola! Bienvenido a Rutel Comunicaciones* 🌟\n\n" +
                "Soy tu *asistente virtual* 🤖. Elige una opción escribiendo el número correspondiente:\n\n" +
                "1️⃣ *Ver nuestros productos*\n" +
                "2️⃣ *Descubrir nuestros servicios*\n" +
                "3️⃣ *Necesito soporte técnico*\n" +
                "4️⃣ *Quiero un asesor humano*\n" +
                "5️⃣ *Salir del chat*\n\n" +
                "💬 *Ejemplo:* escribe `1` para conocer nuestros productos.";
            break;

        // Entrada no reconocida
        default:
            respuesta = "😕 *No entendí tu mensaje.*\n\n" +
                        "Por favor responde con el número de la opción (como `1`, `2`,`22`, `3`,`31`, etc.).\nEscribe `0` para volver al menú principal.";
            break;
    }

    return respuesta;
}
// 🚀 Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

// 🛡️ Captura de errores
process.on('uncaughtException', (err) => {
    console.error('❗ Error no capturado:', err);
    if (client) {
        client.destroy();
    }
    process.exit(1);
});

/* Iniciar servidor en puerto 3000
server.listen(3000, () => {
    console.log('🚀 Servidor corriendo en http://localhost:3000');
});
// Manejo de errores
process.on('uncaughtException', (err) => {
    console.error('❗ Error no capturado:', err);
    if (client) {
        client.destroy();
    }
    process.exit(1);
});*/

