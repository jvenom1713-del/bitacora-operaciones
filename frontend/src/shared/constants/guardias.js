export const MATRIZ_GUARDIAS = {
  JAGUAR: {
    rotacion: 'JAGUAR',
    jdt: 'Javier San Martin',
    osc: 'Humberto Barra Tapia',
    ot: 'Eric Godoy Diaz'
  },
  HALCONES: {
    rotacion: 'HALCONES',
    jdt: 'Pablo Flores Vasquez',
    osc: 'Luis Morales',
    ot: 'Gerson Cofré'
  },
  TIGRES: {
    rotacion: 'TIGRES',
    jdt: 'Ariel Torres',
    osc: 'Jorge Albornoz',
    ot: 'Matias Cisternas'
  },
  LEONES: {
    rotacion: 'LEONES',
    jdt: 'Norman Galaz',
    osc: 'Eduardo Armijo Retamal',
    ot: 'Carlos Vivero'
  },
  AGUILAS: {
    rotacion: 'AGUILAS',
    jdt: 'Cristian Valdivia Maldonado',
    osc: 'Aristides Toledo Peña',
    ot: 'Claudio Garrido San Martin'
  }
};

export const MOTIVOS_CONTINGENCIA = [
  'Licencia',
  'Día compensado',
  'Día administrativo',
  'Mantenimiento',
  'Problemas climáticos',
  'Otro'
];

export function detectarContingenciasGuardia(equipoTurno) {
  const rotacion = equipoTurno?.rotacion || 'TIGRES';
  const oficial = MATRIZ_GUARDIAS[rotacion] || MATRIZ_GUARDIAS.TIGRES;
  
  const reemplazos = [];
  if (equipoTurno?.jdt && equipoTurno.jdt !== oficial.jdt) {
    reemplazos.push({ cargo: 'Jefe de Turno', actual: equipoTurno.jdt, original: oficial.jdt });
  }
  if (equipoTurno?.osc && equipoTurno.osc !== oficial.osc) {
    reemplazos.push({ cargo: 'Operador Sala Control', actual: equipoTurno.osc, original: oficial.osc });
  }
  if (equipoTurno?.ot && equipoTurno.ot !== oficial.ot) {
    reemplazos.push({ cargo: 'Operador Terreno', actual: equipoTurno.ot, original: oficial.ot });
  }

  const hayContingencia = reemplazos.length > 0;
  return {
    hayContingencia,
    reemplazos,
    oficial,
    resumenReemplazos: reemplazos.map(r => `${r.actual} reemplaza a ${r.original}`).join(' | ')
  };
}
