# Software Data Web App

Una aplicación web basada en Node.js y Express que expone una API RESTful para la gestión de datos de software. Esta documentación abarca **TODA** la información necesaria para la instalación, configuración, creación y uso de los endpoints de la API.

## Tabla de Contenidos

- [Acerca del Proyecto](#acerca-del-proyecto)
- [Instalación](#instalación)
  - [Requisitos Previos](#requisitos-previos)
  - [Pasos de Instalación](#pasos-de-instalación)
- [Configuración](#configuración)
- [Documentación de la API](#documentación-de-la-api)
  - [Listado de Endpoints](#listado-de-endpoints)
    - [Obtener todos los registros de software](#1-obtener-todos-los-registros-de-software)
    - [Obtener un registro de software por ID](#2-obtener-un-registro-de-software-por-id)
    - [Crear un nuevo registro de software](#3-crear-un-nuevo-registro-de-software)
    - [Actualizar un registro de software](#4-actualizar-un-registro-de-software)
    - [Eliminar un registro de software](#5-eliminar-un-registro-de-software)
- [Uso](#uso)
- [Documentación Adicional (Postman)](#documentación-adicional-postman)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

## Acerca del Proyecto

**Software Data Web App** es una API RESTful diseñada para gestionar una base de datos de registros de software. La aplicación permite realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) mediante endpoints que reciben y retornan datos en formato JSON.

## Instalación

### Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 12 o superior recomendada)
- [npm](https://www.npmjs.com/)

### Pasos de Instalación

1. **Clonar el repositorio:**

   git clone https://github.com/iSehii/softwareData.git

2. **Ingresar al directorio del proyecto:**

   cd softwareData

3. **Instalar las dependencias:**

   npm install

4. **Configurar variables de entorno:**

   Crea un archivo `.env` en la raíz del proyecto y añade la siguiente configuración (ajusta los valores según tu entorno):

   PORT=3000
   DB_URL=tu_conexion_a_la_base_de_datos

5. **Iniciar la aplicación:**

   npm start

   La aplicación se ejecutará en el puerto configurado (por defecto, `http://localhost:3000`).

## Configuración

La aplicación utiliza archivos de configuración ubicados en el directorio `config`. Asegúrate de que las variables definidas en el archivo `.env` sean correctas para la conexión a tu base de datos y otros parámetros necesarios.  
Revisa el archivo `index.js` para entender cómo se inicializa el servidor y se importan los módulos (rutas, controladores, middlewares, etc.).

## Documentación de la API

A continuación se describe en detalle cada uno de los endpoints disponibles. La documentación está basada en la guía de Postman disponible en:  
[Documentación Postman](https://documenter.getpostman.com/view/29602544/2sAYkHoJGS)

### Listado de Endpoints

#### 1. Obtener todos los registros de software

- **Método:** `GET`
- **URL:** `/api/software`
- **Descripción:** Recupera la lista completa de registros de software.
- **Respuesta Exitosa (200):**

  [
    {
      "id": "123",
      "name": "Software A",
      "version": "1.0",
      "description": "Descripción detallada..."
    },
    {
      "id": "124",
      "name": "Software B",
      "version": "2.3",
      "description": "Otra descripción..."
    }
  ]

#### 2. Obtener un registro de software por ID

- **Método:** `GET`
- **URL:** `/api/software/:id`
- **Descripción:** Recupera la información de un registro específico identificado por `id`.
- **Parámetros URL:**
  - `id`: Identificador único del registro de software.
- **Respuesta Exitosa (200):**

  {
    "id": "123",
    "name": "Software A",
    "version": "1.0",
    "description": "Descripción detallada..."
  }

#### 3. Crear un nuevo registro de software

- **Método:** `POST`
- **URL:** `/api/software`
- **Descripción:** Crea un nuevo registro de software.
- **Cuerpo de la Solicitud (JSON):**

  {
    "name": "Software A",
    "version": "1.0",
    "description": "Descripción detallada..."
  }

- **Respuesta Exitosa (201):**

  {
    "message": "Software creado exitosamente",
    "data": {
      "id": "123",
      "name": "Software A",
      "version": "1.0",
      "description": "Descripción detallada..."
    }
  }

#### 4. Actualizar un registro de software

- **Método:** `PUT`
- **URL:** `/api/software/:id`
- **Descripción:** Actualiza la información de un registro existente.
- **Parámetros URL:**
  - `id`: Identificador único del registro de software a actualizar.
- **Cuerpo de la Solicitud (JSON):**

  {
    "name": "Software A - Actualizado",
    "version": "1.1",
    "description": "Descripción actualizada..."
  }

- **Respuesta Exitosa (200):**

  {
    "message": "Software actualizado exitosamente",
    "data": {
      "id": "123",
      "name": "Software A - Actualizado",
      "version": "1.1",
      "description": "Descripción actualizada..."
    }
  }

#### 5. Eliminar un registro de software

- **Método:** `DELETE`
- **URL:** `/api/software/:id`
- **Descripción:** Elimina un registro de software de la base de datos.
- **Parámetros URL:**
  - `id`: Identificador único del registro a eliminar.
- **Respuesta Exitosa (200):**

  {
    "message": "Software eliminado exitosamente"
  }

*Nota:* Los ejemplos anteriores se basan en la [documentación de Postman](https://documenter.getpostman.com/view/29602544/2sAYkHoJGS). Para más detalles sobre posibles códigos de error, validaciones y otros endpoints adicionales (si existieran), se recomienda consultar la documentación en Postman.

## Uso

Una vez que el servidor esté en ejecución, puedes interactuar con la API utilizando herramientas como [Postman](https://www
::contentReference[oaicite:0]{index=0}
 
