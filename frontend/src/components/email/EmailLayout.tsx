import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

export interface EmailLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  toolbar?: React.ReactNode;
}

const LayoutRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flex: '1 1 auto',
  maxWidth: '100%',
  paddingTop: 64,
  [theme.breakpoints.up('lg')]: {
    paddingLeft: 280
  }
}));

const LayoutContainer = styled(Box)({
  display: 'flex',
  flex: '1 1 auto',
  flexDirection: 'column',
  width: '100%'
});

export const EmailLayout: React.FC<EmailLayoutProps> = ({
  children,
  sidebar,
  toolbar
}) => {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));

  return (
    <>
      <Box
        component="nav"
        sx={{
          flexShrink: 0,
          width: 280,
          position: 'fixed',
          height: '100%',
          display: { xs: 'none', lg: 'block' }
        }}
      >
        {sidebar}
      </Box>
      <LayoutRoot>
        <LayoutContainer>
          {toolbar && (
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                height: 64,
                px: 2,
                borderBottom: 1,
                borderColor: 'divider'
              }}
            >
              {toolbar}
            </Box>
          )}
          <Box
            sx={{
              display: 'flex',
              flex: '1 1 auto',
              overflow: 'hidden',
              pt: 2,
              px: 2
            }}
          >
            {children}
          </Box>
        </LayoutContainer>
      </LayoutRoot>
    </>
  );
};

export default EmailLayout; 