import { getDatabase } from './database';

/**
 * Popula o banco com os dados iniciais extraídos da planilha Du Doces.
 * Só executa se não houver matérias-primas cadastradas.
 *
 * RENDIMENTOS por lote (as receitas estão em quantidade POR UNIDADE):
 *  - Húngara:              ~20 fatias por lote
 *  - Bombom morango/uva:   ~7 bombons por lote
 *  - Torta Cookie Nutella: ~8 fatias por torta
 *  - Cookie (massa base):  ~12 cookies por lote
 *  - Brownie:              ~12 por lote
 */
export async function seedDadosIniciais(): Promise<void> {
  const db = await getDatabase();

  // Não executa se já houver dados
  const check = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM materias_primas'
  );
  if (check && check.count > 0) return;

  // ─────────────────────────────────────────────────────────
  // MATÉRIAS-PRIMAS  (custo = preço por unidade da MP: R$/g, R$/ml ou R$/un)
  // ─────────────────────────────────────────────────────────
  const mps: Array<{ nome: string; unidade: string; custo: number; minimo: number }> = [
    { nome: 'Leite',                        unidade: 'ml', custo: 0.00509,  minimo: 1000 },
    { nome: 'Açúcar cristal',               unidade: 'g',  custo: 0.003418, minimo: 2000 },
    { nome: 'Óleo de girassol',             unidade: 'ml', custo: 0.0081,   minimo: 500  },
    { nome: 'Ovos',                         unidade: 'un', custo: 0.783,    minimo: 12   },
    { nome: 'Sal',                          unidade: 'g',  custo: 0.0023,   minimo: 500  },
    { nome: 'Fermento biológico seco',      unidade: 'g',  custo: 0.119,    minimo: 20   },
    { nome: 'Farinha de trigo',             unidade: 'g',  custo: 0.004378, minimo: 2000 },
    { nome: 'Coco ralado',                  unidade: 'g',  custo: 0.0649,   minimo: 100  },
    { nome: 'Margarina',                    unidade: 'g',  custo: 0.01399,  minimo: 500  },
    { nome: 'Leite condensado',             unidade: 'g',  custo: 0.0316,   minimo: 395  },
    { nome: 'Kinder Bueno (pasta)',         unidade: 'g',  custo: 0.06694,  minimo: 200  },
    { nome: 'Nutella',                      unidade: 'g',  custo: 0.0769,   minimo: 300  },
    { nome: 'Doce de leite',               unidade: 'g',  custo: 0.029975, minimo: 400  },
    { nome: 'Creme de leite',              unidade: 'g',  custo: 0.02145,  minimo: 200  },
    { nome: 'Leite em pó Ninho',           unidade: 'g',  custo: 0.0632,   minimo: 380  },
    { nome: 'Manteiga',                    unidade: 'g',  custo: 0.01399,  minimo: 500  },
    { nome: 'Morango',                     unidade: 'un', custo: 0.927,    minimo: 14   },
    { nome: 'Uva',                         unidade: 'un', custo: 0.927,    minimo: 14   },
    { nome: 'Açúcar mascavo',              unidade: 'g',  custo: 0.028975, minimo: 400  },
    { nome: 'Nescau',                      unidade: 'g',  custo: 0.0267,   minimo: 500  },
    { nome: 'Bicarbonato de sódio',        unidade: 'g',  custo: 0.0527,   minimo: 70   },
    { nome: 'Fermento em pó',             unidade: 'g',  custo: 0.0359,   minimo: 100  },
    { nome: "M&M's",                       unidade: 'g',  custo: 0.082,    minimo: 200  },
    { nome: 'Kinder Bueno (barrinha)',     unidade: 'un', custo: 1.25,     minimo: 8    },
  ];

  for (const mp of mps) {
    await db.runAsync(
      `INSERT INTO materias_primas (nome, unidade, custo_ultima_compra, custo_medio, estoque_atual, estoque_minimo, usar_custo_medio)
       VALUES (?, ?, ?, ?, 0, ?, 0)`,
      [mp.nome, mp.unidade, mp.custo, mp.custo, mp.minimo]
    );
  }

  // ─────────────────────────────────────────────────────────
  // PRODUTOS  (preço de venda para escola/unidade)
  // ─────────────────────────────────────────────────────────
  const produtos: Array<{ nome: string; preco: number; descricao?: string }> = [
    { nome: 'Fatia Húngara Tradicional',    preco: 5.00,  descricao: 'Lote ≈ 20 fatias' },
    { nome: 'Fatia Húngara Nutella',        preco: 10.00, descricao: 'Lote ≈ 20 fatias' },
    { nome: 'Fatia Húngara Doce de Leite',  preco: 6.50,  descricao: 'Lote ≈ 20 fatias' },
    { nome: 'Fatia Húngara Creme de Ninho', preco: 7.50,  descricao: 'Lote ≈ 20 fatias' },
    { nome: 'Fatia Húngara Kinder Bueno',   preco: 8.50,  descricao: 'Lote ≈ 20 fatias' },
    { nome: 'Bombom de Morango',           preco: 12.00, descricao: 'Lote ≈ 7 bombons' },
    { nome: 'Bombom de Uva',               preco: 12.00, descricao: 'Lote ≈ 7 bombons' },
    { nome: 'Torta Cookie Nutella (fatia)', preco: 15.00, descricao: 'Torta inteira ≈ 8 fatias / R$120' },
    { nome: 'Cookie Bueno',                preco: 10.00, descricao: 'Lote de massa ≈ 12 cookies' },
    { nome: 'Cookie Tradicional',          preco: 8.00,  descricao: 'Lote de massa ≈ 12 cookies' },
    { nome: 'Brownie Tradicional',         preco: 5.00,  descricao: 'Lote ≈ 12 brownies' },
    { nome: 'Brownie Doce de Leite',       preco: 6.50,  descricao: 'Lote ≈ 12 brownies' },
    { nome: 'Brownie Nutella',             preco: 8.00,  descricao: 'Lote ≈ 12 brownies' },
    { nome: 'Brownie Ninho',               preco: 8.50,  descricao: 'Lote ≈ 12 brownies' },
    { nome: 'Brownie Kinder Bueno',        preco: 9.00,  descricao: 'Lote ≈ 12 brownies' },
  ];

  for (const p of produtos) {
    await db.runAsync(
      `INSERT INTO produtos (nome, descricao, preco_venda, estoque_atual, unidade) VALUES (?, ?, ?, 0, 'unidade')`,
      [p.nome, p.descricao ?? '', p.preco]
    );
  }

  // ─────────────────────────────────────────────────────────
  // RECEITAS — helper
  // ─────────────────────────────────────────────────────────
  const allMps = await db.getAllAsync<{ id: number; nome: string }>(
    'SELECT id, nome FROM materias_primas'
  );
  const allProdutos = await db.getAllAsync<{ id: number; nome: string }>(
    'SELECT id, nome FROM produtos'
  );
  const mpMap = Object.fromEntries(allMps.map(m => [m.nome, m.id]));
  const pdMap = Object.fromEntries(allProdutos.map(p => [p.nome, p.id]));

  const addReceita = async (
    nomeProduto: string,
    itens: Array<{ nome: string; qtd: number }>
  ) => {
    const prodId = pdMap[nomeProduto];
    if (!prodId) return;
    for (const item of itens) {
      const mpId = mpMap[item.nome];
      if (!mpId) continue;
      await db.runAsync(
        'INSERT INTO receitas (produto_id, materia_prima_id, quantidade) VALUES (?, ?, ?)',
        [prodId, mpId, item.qtd]
      );
    }
  };

  // ─────────────────────────────────────────────────────────
  // BASE DA HÚNGARA  (quantidades POR FATIA — lote rende ~20)
  // ─────────────────────────────────────────────────────────
  const baseHungara = [
    { nome: 'Leite',               qtd: 12.5 },  // ml
    { nome: 'Açúcar cristal',      qtd: 10   },  // g
    { nome: 'Óleo de girassol',    qtd: 5    },  // ml
    { nome: 'Ovos',                qtd: 0.1  },  // un  (2 ovos / 20 fatias)
    { nome: 'Sal',                 qtd: 0.2  },  // g
    { nome: 'Fermento biológico seco', qtd: 1.0 }, // g
    { nome: 'Farinha de trigo',    qtd: 50   },  // g
    { nome: 'Coco ralado',         qtd: 7.5  },  // g
    { nome: 'Margarina',           qtd: 4    },  // g
    { nome: 'Leite condensado',    qtd: 20   },  // g
  ];

  await addReceita('Fatia Húngara Tradicional', baseHungara);

  await addReceita('Fatia Húngara Nutella', [
    ...baseHungara,
    { nome: 'Nutella', qtd: 20 },                // g de recheio por fatia
  ]);

  await addReceita('Fatia Húngara Doce de Leite', [
    ...baseHungara,
    { nome: 'Doce de leite', qtd: 20 },          // g
  ]);

  await addReceita('Fatia Húngara Creme de Ninho', [
    ...baseHungara,
    { nome: 'Creme de leite',   qtd: 10   },     // g  (200g / 20 fatias)
    { nome: 'Leite em pó Ninho', qtd: 4.75 },    // g  (95g / 20)
    { nome: 'Leite condensado', qtd: 20   },     // g  (395g / 20, já incluso no base)
    { nome: 'Manteiga',         qtd: 1    },     // g  (20g / 20)
  ]);

  await addReceita('Fatia Húngara Kinder Bueno', [
    ...baseHungara,
    { nome: 'Kinder Bueno (pasta)', qtd: 20 },   // g
  ]);

  // ─────────────────────────────────────────────────────────
  // BOMBONS  (quantidades POR BOMBOM — lote rende ~7)
  // Brigadeiro de ninho: creme de leite + leite condensado + ninho + manteiga
  // ─────────────────────────────────────────────────────────
  const baseBombom = [
    { nome: 'Creme de leite',    qtd: 28.6 }, // g  (200g / 7)
    { nome: 'Leite condensado',  qtd: 56.4 }, // g  (395g / 7)
    { nome: 'Leite em pó Ninho', qtd: 13.6 }, // g  (95g / 7)
    { nome: 'Manteiga',          qtd: 2.9  }, // g  (20g / 7)
  ];

  await addReceita('Bombom de Morango', [
    { nome: 'Morango', qtd: 0.29 },            // un  (2 un / 7)
    ...baseBombom,
  ]);

  await addReceita('Bombom de Uva', [
    { nome: 'Uva', qtd: 0.29 },                // un
    ...baseBombom,
  ]);

  // ─────────────────────────────────────────────────────────
  // TORTA COOKIE NUTELLA  (quantidades POR FATIA — torta ≈ 8 fatias)
  // ─────────────────────────────────────────────────────────
  await addReceita('Torta Cookie Nutella (fatia)', [
    { nome: 'Manteiga',          qtd: 18.75 }, // g  (150g / 8)
    { nome: 'Açúcar cristal',    qtd: 12.5  }, // g  (100g / 8)
    { nome: 'Açúcar mascavo',    qtd: 12.5  }, // g
    { nome: 'Leite em pó Ninho', qtd: 12.5  }, // g  (100g / 8)
    { nome: 'Farinha de trigo',  qtd: 47.5  }, // g  (380g / 8)
    { nome: 'Fermento em pó',   qtd: 1.25  }, // g  (10g / 8)
    { nome: 'Ovos',              qtd: 0.25  }, // un  (2 / 8)
    { nome: 'Nutella',           qtd: 81.25 }, // g  (650g / 8)
    { nome: "M&M's",             qtd: 18.75 }, // g  (150g / 8)
  ]);

  // ─────────────────────────────────────────────────────────
  // COOKIE — massa base POR COOKIE  (lote de massa ≈ 12 cookies)
  // Manteiga 170g / Açúcar 50g / Açúcar mascavo 150g / Bicarbonato 1g /
  // Farinha 300g / Fermento 5g / Ovos 2un  →  divide por 12
  // ─────────────────────────────────────────────────────────
  const baseCookieMassa = [
    { nome: 'Manteiga',            qtd: 14.2  }, // g
    { nome: 'Açúcar cristal',      qtd: 4.2   }, // g
    { nome: 'Açúcar mascavo',      qtd: 12.5  }, // g
    { nome: 'Bicarbonato de sódio', qtd: 0.08 }, // g
    { nome: 'Farinha de trigo',    qtd: 25    }, // g
    { nome: 'Fermento em pó',     qtd: 0.42  }, // g
    { nome: 'Ovos',                qtd: 0.17  }, // un
  ];

  await addReceita('Cookie Tradicional', baseCookieMassa);

  await addReceita('Cookie Bueno', [
    ...baseCookieMassa,
    { nome: 'Kinder Bueno (pasta)',   qtd: 30 }, // g de recheio por cookie
    { nome: 'Kinder Bueno (barrinha)', qtd: 1 }, // 1 barrinha por cookie
  ]);

  // ─────────────────────────────────────────────────────────
  // BROWNIE — base POR UNIDADE  (lote ≈ 12 brownies)
  // Manteiga 53g / Açúcar 100g / Nescau 180g / Farinha 280g / Ovos 3
  // ─────────────────────────────────────────────────────────
  const baseBrownie = [
    { nome: 'Manteiga',        qtd: 4.4  }, // g  (53g / 12)
    { nome: 'Açúcar cristal',  qtd: 8.3  }, // g  (100g / 12)
    { nome: 'Nescau',          qtd: 15   }, // g  (180g / 12)
    { nome: 'Farinha de trigo', qtd: 23.3 }, // g  (280g / 12)
    { nome: 'Ovos',            qtd: 0.25 }, // un  (3 / 12)
  ];

  await addReceita('Brownie Tradicional', baseBrownie);

  await addReceita('Brownie Doce de Leite', [
    ...baseBrownie,
    { nome: 'Doce de leite', qtd: 30 },         // g de recheio por brownie
  ]);

  await addReceita('Brownie Nutella', [
    ...baseBrownie,
    { nome: 'Nutella', qtd: 30 },               // g
  ]);

  await addReceita('Brownie Ninho', [
    ...baseBrownie,
    { nome: 'Leite em pó Ninho', qtd: 30 },     // g  (creme ninho simplificado)
  ]);

  await addReceita('Brownie Kinder Bueno', [
    ...baseBrownie,
    { nome: 'Kinder Bueno (pasta)',    qtd: 30 }, // g
    { nome: 'Kinder Bueno (barrinha)', qtd: 0.63 }, // ~5g / 8 = pedaço de barrinha
  ]);
}
