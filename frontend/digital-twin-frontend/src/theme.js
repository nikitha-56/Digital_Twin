import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4CAF50',
    },
    secondary: {
      main: '#00BCD4',
    },
    error: {
      main: '#F44336',
    },
    warning: {
      main: '#FFC107',
    },
    background: {
      default: '#061423',
      paper: '#072032'
    }
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 1
      }
    }
  }
})

export default theme
