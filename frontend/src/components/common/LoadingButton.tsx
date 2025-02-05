import React from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

const StyledButton = styled(Button)(({ theme }) => ({
  position: 'relative',
  '& .MuiCircularProgress-root': {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  }
}));

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  loading = false,
  disabled,
  ...props
}) => {
  return (
    <StyledButton
      disabled={loading || disabled}
      {...props}
    >
      {children}
      {loading && <CircularProgress size={24} />}
    </StyledButton>
  );
};

export default LoadingButton; 