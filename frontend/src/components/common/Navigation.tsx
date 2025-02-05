import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  ListItemIcon
} from '@mui/material';
import {
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Mail as MailIcon
} from '@mui/icons-material';

export interface NavigationProps {
  userEmail?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  userEmail = 'user@example.com',
  userAvatar,
  onLogout
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout?.();
  };

  return (
    <AppBar position="fixed" color="default" elevation={1}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          sx={{ mr: 2 }}
          onClick={() => navigate('/email')}
        >
          <MailIcon />
        </IconButton>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AiMail
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            color={location.pathname === '/email' ? 'primary' : 'inherit'}
            onClick={() => navigate('/email')}
            startIcon={<MailIcon />}
          >
            Email
          </Button>

          <Button
            color={location.pathname === '/settings' ? 'primary' : 'inherit'}
            onClick={() => navigate('/settings')}
            startIcon={<SettingsIcon />}
          >
            Settings
          </Button>

          <Tooltip title={userEmail}>
            <IconButton
              size="large"
              onClick={handleMenu}
              color="inherit"
            >
              {userAvatar ? (
                <Avatar
                  src={userAvatar}
                  alt={userEmail}
                  sx={{ width: 32, height: 32 }}
                />
              ) : (
                <AccountIcon />
              )}
            </IconButton>
          </Tooltip>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={() => navigate('/settings')}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 