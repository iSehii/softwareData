require('dotenv').config();
const { databaseMySQL } = require('../config/SQL');
const { Permission } = require('../models/permissionModel');
const { Rol } = require('../models/rolModel');
const { RolePermission } = require('../models/rolePermissionModel');

async function upsert(model, where, defaults) {
  const [instance] = await model.findOrCreate({ where, defaults });
  return instance;
}

async function seed() {
  try {
    await databaseMySQL.authenticate();
    await databaseMySQL.sync({ force: false });

    const modules = {
      Usuarios: [
        ['VIEW', 'Ver lista de usuarios'],
        ['CREATE', 'Crear nuevos usuarios'],
        ['EDIT', 'Editar usuarios existentes'],
        ['DELETE', 'Eliminar usuarios']
      ],
      CARROCERIAS: [
        ['VIEW', 'Ver lista de carrocerías'],
        ['CREATE', 'Crear nuevas carrocerías'],
        ['EDIT', 'Editar carrocerías existentes'],
        ['DELETE', 'Eliminar carrocerías']
      ],
      REPORTES: [
        ['VIEW', 'Ver lista de reportes'],
        ['CREATE', 'Crear nuevos reportes'],
        ['EDIT', 'Editar reportes existentes'],
        ['DELETE', 'Eliminar reportes']
      ],
      ROLES: [
        ['VIEW', 'Ver lista de roles'],
        ['CREATE', 'Crear nuevos roles'],
        ['EDIT', 'Editar roles existentes'],
        ['DELETE', 'Eliminar roles']
      ],
      PERMISOS: [
        ['VIEW', 'Ver lista de permisos'],
        ['CREATE', 'Crear nuevos permisos'],
        ['EDIT', 'Editar permisos existentes'],
        ['DELETE', 'Eliminar permisos']
      ],
      FEEDBACK: [
        ['VIEW', 'Ver lista de feedbacks'],
        ['CREATE', 'Crear nuevos feedbacks'],
        ['EDIT', 'Editar feedbacks existentes'],
        ['DELETE', 'Eliminar feedbacks']
      ],
      IMPERFECCIONES: [
        ['VIEW', 'Ver lista de imperfecciones'],
        ['CREATE', 'Crear nuevas imperfecciones'],
        ['EDIT', 'Editar imperfecciones existentes'],
        ['DELETE', 'Eliminar imperfecciones']
      ],
      IMAGENES: [
        ['VIEW', 'Ver lista de imágenes'],
        ['CREATE', 'Subir nuevas imágenes'],
        ['EDIT', 'Editar imágenes existentes'],
        ['DELETE', 'Eliminar imágenes']
      ]
    };

    // Insertar/asegurar permisos
    const permissionRecords = [];
    for (const [moduleName, actions] of Object.entries(modules)) {
      for (const [action, descripcion] of actions) {
        const permission = await upsert(
          Permission,
          { module: moduleName, action },
          { module: moduleName, action, descripcion }
        );
        // Si ya existía, actualizamos la descripción por si cambió
        if (permission.descripcion !== descripcion) {
          permission.descripcion = descripcion;
          await permission.save();
        }
        permissionRecords.push(permission);
      }
    }

    // Insertar/asegurar roles
    const admin = await upsert(Rol, { nombre: 'Administrador' }, { nombre: 'Administrador' });
    const usuario = await upsert(Rol, { nombre: 'Usuario' }, { nombre: 'Usuario' });
    const supervisor = await upsert(Rol, { nombre: 'Supervisor' }, { nombre: 'Supervisor' });

    // Helper de asignación asegurando unicidad por índice único (role_id, permission_id)
    async function assignRolePermission(roleId, permissionId) {
      await RolePermission.findOrCreate({ where: { role_id: roleId, permission_id: permissionId }, defaults: { role_id: roleId, permission_id: permissionId } });
    }

    // Asignar todos los permisos al Administrador
    for (const perm of permissionRecords) {
      await assignRolePermission(admin.id, perm.id);
    }

    // Asignar permisos básicos al Usuario: VIEW en CARROCERIAS, REPORTES, FEEDBACK
    for (const perm of permissionRecords) {
      if (
        perm.action === 'VIEW' &&
        ['CARROCERIAS', 'REPORTES', 'FEEDBACK'].includes(perm.module)
      ) {
        await assignRolePermission(usuario.id, perm.id);
      }
    }

    // Asignar permisos de Supervisor: VIEW y EDIT en módulos seleccionados
    for (const perm of permissionRecords) {
      if (
        ['VIEW', 'EDIT'].includes(perm.action) &&
        ['CARROCERIAS', 'REPORTES', 'FEEDBACK', 'IMPERFECCIONES'].includes(perm.module)
      ) {
        await assignRolePermission(supervisor.id, perm.id);
      }
    }

    // Reporte simple por consola
    const { count: permissionsCount } = await Permission.findAndCountAll();
    console.log(`Permisos totales: ${permissionsCount}`);
    console.log('Seed RBAC completado.');
  } catch (error) {
    console.error('Error en seed RBAC:', error);
    process.exitCode = 1;
  } finally {
    await databaseMySQL.close();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };


