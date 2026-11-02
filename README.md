# discord-initializer

Scripts de línea de comandos para preparar un servidor de Discord de cursada al comienzo de cada cuatrimestre.

- **`cleanup.js`**: deja el servidor limpio para una nueva cursada.
- **`setup.js`**: crea la estructura de una materia (categoría, roles y canales por equipo).

Ninguno queda corriendo como bot: se conectan, hacen su trabajo y terminan.

## Requisitos

- Node.js 18 o superior.
- Ser dueño o administrador del servidor de Discord (para poder agregar el bot y configurar roles).

## Configuración inicial (una sola vez)

### 1. Crear el bot y obtener el token

1. Entrá al [Discord Developer Portal](https://discord.com/developers/applications) e iniciá sesión.
2. Hacé clic en **New Application**, ponele un nombre (por ejemplo `discord-initializer`), aceptá los términos y hacé clic en **Create**.
3. En el menú de la izquierda, entrá a **Bot**.
4. En la sección **Token**, hacé clic en **Reset Token**, confirmá y copiá el token. Discord lo muestra **una sola vez**. Si lo perdés, tenés que volver a resetearlo.
5. En esa misma página, en **Privileged Gateway Intents**, activá **Server Members Intent** y guardá con **Save Changes**. Sin esto, el bot no puede listar a los miembros y los scripts fallan.

⚠️ El token es la contraseña del bot. No lo commitees ni lo compartas: va solo en `.env`, que está ignorado por git. Si se filtra, resetealo desde la misma pantalla.

### 2. Agregar el bot al servidor

1. En el Developer Portal, entrá a **Installation** en el menú de la izquierda.
2. En **Installation Contexts**, dejá marcado **Guild Install** (User Install no hace falta).
3. En **Install Link**, elegí **Discord Provided Link**.
4. En **Default Install Settings** → **Guild Install**, agregá el scope `bot` y, en **Permissions**, elegí `Administrator`. Guardá los cambios.
5. Copiá la URL de **Install Link**, abrila en el navegador, elegí **Add to server**, seleccioná el servidor y autorizá.

Para agregar un bot a un servidor necesitás el permiso **Manage Server** en ese servidor.

> Alternativa: en **OAuth2** → **URL Generator** podés marcar el scope `bot` y el permiso `Administrator`, y usar la URL que se genera al pie de la página.

### 3. Configurar los roles en el servidor

1. En Discord, entrá a **Ajustes del servidor** → **Roles**.
2. Creá (si no existe) un rol llamado exactamente **`Docentes`** y asignáselo a los docentes. Ese rol nunca se borra y sus miembros nunca se expulsan.
3. Arrastrá el rol del bot (tiene el mismo nombre que la aplicación) **arriba de todo** en la lista de roles. Discord no deja que un bot borre roles ni expulse miembros cuyo rol esté por encima del suyo, aunque tenga Administrator.

#### ¿Por qué Administrator?

Los canales de equipo le niegan `ViewChannel` a `@everyone`, y Discord no deja borrar un canal que el bot no puede ver, aunque tenga `Manage Channels` a nivel servidor. Con Administrator el bot ignora esos permisos por canal.

### 4. Obtener el ID del servidor

1. En Discord, entrá a **Ajustes de usuario** → **Avanzado** y activá **Modo desarrollador**.
2. Hacé clic derecho sobre el ícono del servidor y elegí **Copiar ID del servidor**.

### 5. Instalar y configurar el proyecto

```bash
npm install
cp .env.example .env
```

Completá `.env` con el token del paso 1 y el ID del paso 4:

```
DISCORD_TOKEN=token_del_bot
GUILD_ID=id_del_servidor
```

### 6. Verificar

```bash
node cleanup.js --dry-run
```

Si se conecta y muestra la lista de miembros, roles y canales, ya está todo configurado. Errores comunes:

- `DISCORD_TOKEN no está definido en .env` o `GUILD_ID no está definido en .env`: falta completar `.env`.
- `Login timeout` o `An invalid token was provided`: el token es incorrecto o se reseteó.
- `Used disallowed intents`: falta activar **Server Members Intent** (paso 1.5).
- `El bot no tiene los permisos necesarios: Administrator`: el bot no tiene ese permiso en el servidor (paso 2).

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

## Rehacer los grupos de una materia (`delete-category.js`)

Para borrar los grupos de una sola categoría sin tocar el resto del servidor:

```bash
node delete-category.js --dry-run   # vista previa
npm run delete-category             # ejecuta (pide confirmación)
```

El script te deja elegir una categoría y borra:

- Todos los canales de esa categoría y la categoría misma.
- Los roles que dan acceso a esos canales (por ejemplo `diseño-equipo-N`). No borra `@everyone`, `Docentes`, los roles de integraciones ni los roles que también se usan en canales de otras categorías.

También expulsa a los miembros que tienen alguno de esos roles, salvo:

- Los `Docentes` y los bots.
- Los alumnos que también tienen un rol de equipo de otra categoría (por ejemplo, alguien que cursa las dos materias). El script los lista aparte y les saca solo el rol de esta categoría, al borrarlo.

Los miembros sin ningún rol de equipo (por ejemplo, los que todavía están esperando en `lobby`) no se expulsan.

Después corré `npm run setup` para crear los grupos nuevos.

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
