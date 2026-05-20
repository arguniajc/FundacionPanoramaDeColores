import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

/** @param {{ columnas?: number, filas?: number }} props */
export default function SkeletonTabla({ columnas = 4, filas = 6 }) {
  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {Array.from({ length: columnas }).map((_, i) => (
              <TableCell key={i}><Skeleton variant="text" width="80%" /></TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: filas }).map((_, r) => (
            <TableRow key={r}>
              {Array.from({ length: columnas }).map((_, c) => (
                <TableCell key={c}><Skeleton variant="text" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
