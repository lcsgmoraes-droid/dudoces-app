import { getDatabase } from '../database/database';
import { Cliente } from '../types';

export async function listarClientes(): Promise<Cliente[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Cliente>(
    'SELECT * FROM clientes ORDER BY nome ASC'
  );
}

export async function buscarCliente(id: number): Promise<Cliente | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Cliente>(
    'SELECT * FROM clientes WHERE id = ?', [id]
  );
}

export async function salvarCliente(cliente: Omit<Cliente, 'id' | 'created_at'>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO clientes (nome, telefone, email, endereco, observacao)
     VALUES (?, ?, ?, ?, ?)`,
    [cliente.nome, cliente.telefone || null, cliente.email || null,
     cliente.endereco || null, cliente.observacao || null]
  );
  return result.lastInsertRowId;
}

export async function atualizarCliente(id: number, cliente: Omit<Cliente, 'id' | 'created_at'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE clientes SET nome=?, telefone=?, email=?, endereco=?, observacao=?
     WHERE id=?`,
    [cliente.nome, cliente.telefone || null, cliente.email || null,
     cliente.endereco || null, cliente.observacao || null, id]
  );
}

export async function excluirCliente(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clientes WHERE id = ?', [id]);
}
