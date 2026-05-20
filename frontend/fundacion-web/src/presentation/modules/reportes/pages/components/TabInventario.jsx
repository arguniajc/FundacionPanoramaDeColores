import { useState, useEffect } from 'react';
import {
  Alert, Box, Card, CardContent, Chip, Grid, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import InventoryIcon    from '@mui/icons-material/Inventory';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  BarChart, Bar, CartesianGrid, Cell, Legend,
  PieChart, Pie, Tooltip, XAxis, YAxis,
} from 'recharts';
import apiClient from '../../../../../infrastructure/http/apiClient';
import { COLORES, GraficaCard, KpiCard, SkeletonSection, TooltipCustom } from './helpers';

export function TabInventario() {
  const [data,  setData]  = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.get('/api/reportes/inventario')
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar reporte de inventario'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data)  return <SkeletonSection />;

  const { resumen, porCategoria, movimientosPorTipo, itemsCriticos } = data;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiCard label="Total ítems" value={resumen.totalItems} icon={<InventoryIcon fontSize="inherit" />} color="#4E1B95" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiCard label="Bajo stock mínimo" value={resumen.itemsBajoStock} icon={<WarningAmberIcon fontSize="inherit" />} color="#EF4444" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiCard label="Categorías" value={resumen.categorias} icon={<InventoryIcon fontSize="inherit" />} color="#F59E0B" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <KpiCard label="Stock total (unidades)" value={Number(resumen.stockTotal).toLocaleString('es-CO')} icon={<InventoryIcon fontSize="inherit" />} color="#10B981" />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <GraficaCard titulo="Ítems por categoría">
          <BarChart data={porCategoria}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<TooltipCustom />} />
            <Bar dataKey="items" name="Ítems" radius={[4,4,0,0]}>
              {porCategoria.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Bar>
          </BarChart>
        </GraficaCard>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <GraficaCard titulo="Movimientos últimos 30 días">
          <PieChart>
            <Pie data={movimientosPorTipo} dataKey="cantidad" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90}
              label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
              {movimientosPorTipo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </GraficaCard>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <GraficaCard titulo="Stock total por categoría">
          <PieChart>
            <Pie data={porCategoria} dataKey="stockTotal" nameKey="categoria" cx="50%" cy="50%" outerRadius={90}
              label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
              {porCategoria.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [v?.toLocaleString('es-CO'), 'Stock']} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </GraficaCard>
      </Grid>

      {itemsCriticos.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'error.light' }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <WarningAmberIcon color="error" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={700} color="error.main">Ítems bajo stock mínimo</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell fontWeight={700}>Ítem</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Stock actual</TableCell>
                      <TableCell align="right">Stock mínimo</TableCell>
                      <TableCell>Nivel</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itemsCriticos.map((it, i) => {
                      const pct = it.stockMinimo > 0 ? Math.min(100, (it.stockActual / it.stockMinimo) * 100) : 0;
                      return (
                        <TableRow key={i} hover>
                          <TableCell>{it.nombre}</TableCell>
                          <TableCell><Chip label={it.categoria} size="small" /></TableCell>
                          <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>{Number(it.stockActual).toLocaleString('es-CO')}</TableCell>
                          <TableCell align="right">{Number(it.stockMinimo).toLocaleString('es-CO')}</TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            <LinearProgress variant="determinate" value={pct} color="error" sx={{ height: 8, borderRadius: 4 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}
