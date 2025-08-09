import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Alert,
  AlertTitle
} from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You can also log the error to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              textAlign="center"
              gap={3}
            >
              <ErrorOutline sx={{ fontSize: 80, color: 'error.main' }} />
              
              <Typography variant="h4" component="h1" gutterBottom>
                Oops! Something went wrong
              </Typography>
              
              <Typography variant="body1" color="text.secondary" paragraph>
                We're sorry for the inconvenience. The application has encountered an unexpected error.
              </Typography>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
                  <AlertTitle>Error Details (Development Mode)</AlertTitle>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </Typography>
                </Alert>
              )}

              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary">
                If this problem persists, please contact support.
              </Typography>
            </Box>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
