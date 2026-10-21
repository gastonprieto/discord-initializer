# discord-initializer

Scripts de línea de comandos para preparar un servidor de Discord de cursada al comienzo de cada cuatrimestre.

- **`cleanup.js`**: deja el servidor limpio para una nueva cursada.
- **`setup.js`**: crea la estructura de una materia (categoría, roles y canales por equipo).

Ninguno queda corriendo como bot: se conectan, hacen su trabajo y terminan.

## Requisitos

- Node.js 18 o superior.
- Un bot de Discord agregado al servidor con permiso de **Administrator**.
- En el [Developer Portal](https://discord.com/developers/applications), en la sección **Bot**, tiene que estar activado **Server Members Intent** (el bot necesita listar los miembros).
- Un rol llamado exactamente **`Docentes`** asignado a los docentes. Ese rol nunca se borra y sus miembros nunca se expulsan.

### ¿Por qué Administrator?

Los canales de equipo le niegan `ViewChannel` a `@everyone`, y Discord no deja borrar un canal que el bot no puede ver, aunque tenga `Manage Channels` a nivel servidor. Con Administrator el bot ignora esos permisos por canal.

## Instalación

```bash
npm install
cp .env.example .env
```

Completá `.env`:

```
DISCORD_TOKEN=token_del_bot
GUILD_ID=id_del_servidor
```

Para obtener el `GUILD_ID`, activá el modo desarrollador en Discord (Ajustes → Avanzado), hacé clic derecho en el servidor y elegí **Copiar ID del servidor**.

## Uso

Siempre conviene correr primero con `--dry-run`, que muestra lo que va a pasar sin hacer cambios.

### 1. Limpiar el servidor (`cleanup.js`)

```bash
node cleanup.js --dry-run   # vista previa
npm run cleanup             # ejecuta (pide confirmación)
```

Este script:

1. Expulsa a todos los miembros, excepto los que tienen el rol `Docentes` y los bots.
2. Borra todos los canales y categorías, salvo los canales de sistema, reglas y novedades de comunidad.
3. Borra todos los roles, excepto `@everyone`, `Docentes` y los roles administrados por integraciones.
4. Crea un canal `lobby` y fija un mensaje de bienvenida que les pide a los alumnos que se pongan su nombre completo como apodo y escriban `materia - grupo - listo`.

⚠️ No es selectivo: borra **todo** y saca a **todos** los alumnos. Usalo al comenzar el cuatrimestre.

### 2. Crear la estructura de una materia (`setup.js`)

```bash
node setup.js --dry-run     # vista previa
npm run setup               # ejecuta
```

El asistente pregunta:

1. **Materia**: `Diseño` o `Desarrollo`.
2. **Docente**: se elige entre los miembros con el rol `Docentes`.
3. **Números de equipo**, separados por coma (por ejemplo `1, 3, 5`).
4. **Tipo de canal**: solo texto (default), solo voz, o texto y voz.

Y crea:

- Una categoría `{materia}-{nombre del docente}` (por ejemplo `diseño-juan`), oculta para `@everyone` y visible para `Docentes`.
- Un rol por equipo: `{materia}-equipo-N`.
- Un canal por equipo, con el mismo nombre, visible solo para el rol de ese equipo.

Para varias materias, corré `npm run setup` una vez por materia.

### 3. Asignar alumnos a sus equipos

A medida que los alumnos escriben en `lobby`, asignales a mano el rol `{materia}-equipo-N` que corresponda. Con eso ya ven el canal de su equipo.

## Flujo típico de inicio de cuatrimestre

```bash
node cleanup.js --dry-run
npm run cleanup
npm run setup        # una vez por materia
```

## Cambiar algunos grupos a mitad de cursada

Los scripts no permiten borrar equipos puntuales. Además, `setup.js` siempre crea una categoría nueva, así que si ya existe vas a tener dos con el mismo nombre. Para eso:

1. Borrá a mano en Discord los canales y roles `{materia}-equipo-N` que ya no sirvan.
2. Creá los nuevos a mano, o corré `npm run setup` con los números nuevos, mové los canales a la categoría original y borrá la categoría duplicada.

## Debug

Para ver logs detallados de cada paso:

```bash
DEBUG=1 npm run setup
```

## Tests

```bash
npm test                                  # todos los tests
npm test -- tests/lib/discord.test.js     # un archivo puntual
```
