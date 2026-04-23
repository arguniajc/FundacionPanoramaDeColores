import { Component } from 'react';
import { Box, Button, Typography } from '@mui/material';
import logger from '../../shared/utils/logger';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Error inesperado' };
  }

  componentDidCatch(error, info) {
    logger.react.error(error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center"
        minHeight="60vh" gap={2} p={4}>
        <Typography variant="h6" color="error" fontWeight={700}>Algo salió mal</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {this.state.message}
        </Typography>
        <Button variant="outlined" onClick={() => this.setState({ hasError: false, message: '' })}>
          Reintentar
        </Button>
      </Box>
    );
  }
}
