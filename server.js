const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static('public'));

// Inicializar WhatsApp pero solo cuando se presione el botón
let client;

// Manejo de conexión desde frontend
io.on('connection', (socket) => {
    console.log('💻 Cliente conectado al frontend');

    socket.on('iniciar', () => {
        console.log('🔄 Usuario presionó "Iniciar"');

        // Inicializa el cliente si aún no está creado
        if (!client) {
            client = new Client({
                authStrategy: new LocalAuth(), // Persistencia local
            });

            // Mostrar QR
            client.on('qr', (qr) => {
                qrcode.generate(qr, { small: true });
                io.emit('qr', qr); // Enviar QR al navegador
            });

            // Cuando WhatsApp está listo
            client.on('ready', () => {
                console.log('✅ ¡Bot conectado a WhatsApp!');
                io.emit('ready');
                io.emit('message', "¡Hola! 👋 Soy el asistente de Rutel Comunicaciones. ¿Cómo puedo ayudarte hoy? 😊\nEscríbeme el número de la opción que más te interese:\n\n1️⃣ Ver nuestros productos\n2️⃣ Descubrir nuestros servicios\n3️⃣ Necesito soporte técnico\n4️⃣ Salir del chat");
            });

            // Autenticación correcta
            client.on('authenticated', () => {
                console.log('🔐 Cliente autenticado');
                io.emit('authenticated');
            });

            // Error de autenticación
            client.on('auth_failure', (message) => {
                console.error('❌ Error de autenticación:', message);
                io.emit('auth_failure', message);
            });

            // Desconexión
            client.on('disconnected', (reason) => {
                console.warn('⚠️ Cliente desconectado:', reason);
                io.emit('disconnected', reason);
                client = null;
            });

            // Mensajes entrantes
            client.on('message', (message) => {
                console.log('📨 Nuevo mensaje:', message.body);
                io.emit('message', message.body);

                const respuesta = getResponse(message.body);
                client.sendMessage(message.from, respuesta)
                    .then(() => io.emit('message', respuesta))
                    .catch(err => {
                        console.error('❌ Error al enviar:', err);
                        io.emit('message', 'Hubo un error al enviar el mensaje. 😕');
                    });
            });

            client.initialize();
        }
    });
});
function getResponse(messageBody) {
    let respuesta = '';

    switch (true) {
        // Menú principal
        case /hola|holaa|respondan|responder|que tal|como estan|quiero saber|productos|servicios|soporte|ayuda|problema|información/i.test(messageBody):
            respuesta = "🌟 *¡Hola! Bienvenido a Rutel Comunicaciones* 🌟\n\n" +
                        "Soy tu *asistente virtual* 🤖. Elige una opción escribiendo el número correspondiente:\n\n" +
                        "1️⃣ *Ver nuestros productos*\n" +
                        "2️⃣ *Descubrir nuestros servicios*\n" +
                        "3️⃣ *Necesito soporte técnico*\n" +
                        "4️⃣ *Salir del chat*\n\n" +
                        "💬 *Ejemplo:* escribe `1` para conocer nuestros productos.";
            break;

        // Opción 1 – Productos
        case messageBody === '1':
            respuesta = "🛍️ *Nuestros Productos Estrella* 🛍️\n\n" +
                        "Selecciona una subopción para más detalles:\n\n" +
                        "1️⃣1️⃣ *Plan Básico (10 Mbps)*\n" +
                        "1️⃣2️⃣ *Plan Avanzado (50 Mbps)*\n" +
                        "1️⃣3️⃣ *Router Wi-Fi*\n" +
                        "1️⃣4️⃣ *Módem portátil*\n\n" +
                        "🔙 Escribe `0` para regresar al menú principal.";
            break;
        case messageBody === '11':
            respuesta = "📶 *Plan Básico (10 Mbps)* – Ideal para navegar y videollamadas.\n💰 Desde S/ 49.90 mensual.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '12':
            respuesta = "🚀 *Plan Avanzado (50 Mbps)* – Perfecto para hogares y oficinas.\n💰 Desde S/ 79.90 mensual.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '13':
            respuesta = "📡 *Router Wi-Fi* – Cobertura estable en todo tu hogar.\n🔧 Instalación incluida.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '14':
            respuesta = "📱 *Módem portátil* – Llévate tu conexión donde vayas.\n\nEscribe `0` para regresar al menú.";
            break;

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
            respuesta = "📱 *Módem portátil* – Ideal para llevar internet donde lo necesites.\n\nEscribe `0` para regresar al menú.";
            break;

        // Servicios – Cámaras de seguridad
        case messageBody === '22':
            respuesta = "📷 *Instalación de Cámaras de Seguridad* 📷\n\n" +
                        "Elige una opción para más información:\n\n" +
                        "2️⃣2️⃣1️⃣ *Cámara HD con instalación incluida*\n" +
                        "2️⃣2️⃣2️⃣ *Kit de 4 cámaras + DVR*\n" +
                        "2️⃣2️⃣3️⃣ *Monitoreo remoto desde celular*\n" +
                        "2️⃣2️⃣4️⃣ *Mantenimiento preventivo*\n\n" +
                        "🔙 Escribe `0` para regresar al menú principal.";
            break;
        case messageBody === '221':
            respuesta = "📷 *Cámara HD con instalación incluida* – Vigilancia básica y efectiva.\nIncluye garantía y soporte.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '222':
            respuesta = "📦 *Kit de 4 cámaras + DVR* – Seguridad total para tu hogar o negocio.\nIncluye grabación continua.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '223':
            respuesta = "📱 *Monitoreo remoto desde celular* – Controla tus cámaras desde cualquier lugar.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '224':
            respuesta = "🧰 *Mantenimiento preventivo* – Mantén tu sistema de seguridad en óptimas condiciones.\nIncluye revisión, limpieza y ajustes.\n\nEscribe `0` para regresar al menú.";
            break;

        // Opción 3 – Soporte Técnico
        case messageBody === '3':
            respuesta = "🛠️ *Soporte Técnico* 🛠️\n\n" +
                        "Selecciona una opción:\n\n" +
                        "3️⃣1️⃣ *Problema de conexión a Internet*\n" +
                        "3️⃣2️⃣ *Problema con dispositivos*\n" +
                        "3️⃣3️⃣ *Otro problema técnico*\n\n" +
                        "🔙 Escribe `0` para regresar al menú principal.";
            break;
        case messageBody === '31':
            respuesta = "📡 *Problema de conexión* – Describe el problema (sin señal, lento, etc.) para ayudarte mejor.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '32':
            respuesta = "💻 *Problema con dispositivos* – Indica qué equipo presenta fallas.\n\nEscribe `0` para regresar al menú.";
            break;
        case messageBody === '33':
            respuesta = "❓ *Otro problema técnico* – Cuéntanos qué sucede y te apoyaremos lo antes posible.\n\nEscribe `0` para regresar al menú.";
            break;

        // Opción 4 – Salida
        case messageBody === '4':
            respuesta = "👋 *Gracias por contactar a Rutel Comunicaciones.*\n¡Hasta pronto! Si necesitas más ayuda, solo escríbeme. 😊";
            break;

        // Volver al menú principal
        case messageBody === '0':
            respuesta = "📋 *Menú Principal*\n\n" +
                        "1️⃣ *Ver nuestros productos*\n" +
                        "2️⃣ *Descubrir nuestros servicios*\n" +
                        "3️⃣ *Necesito soporte técnico*\n" +
                        "4️⃣ *Salir del chat*\n\n" +
                        "💬 Escribe el número de la opción que más te interese.";
            break;

        // Entrada no reconocida
        default:
            respuesta = "😕 *No entendí tu mensaje.*\n\n" +
                        "Por favor responde con el número de la opción (como `1`, `2.2`, `3.1`, etc.).\nEscribe `0` para volver al menú principal.";
            break;
    }

    return respuesta;
}
// Iniciar servidor en puerto 3000
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
});