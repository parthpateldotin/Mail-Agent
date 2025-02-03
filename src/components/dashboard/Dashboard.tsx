import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  useTheme,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Timeline,
  Speed,
  Refresh,
  Settings,
} from '@mui/icons-material';
import ServiceHealth from './ServiceHealth';
import PerformanceMetrics from './PerformanceMetrics';
import WorkflowVisualization from './WorkflowVisualization';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
};

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    // Trigger refresh for all components
    setLastRefresh(new Date());
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            System Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color="textSecondary">
              Last Refresh: {lastRefresh.toLocaleString()}
            </Typography>
            <IconButton onClick={handleRefresh} size="small">
              <Refresh />
            </IconButton>
            <IconButton size="small">
              <Settings />
            </IconButton>
          </Box>
        </Toolbar>
        <Paper elevation={1}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="dashboard tabs"
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Tab
              icon={<DashboardIcon />}
              label="Service Health"
              {...a11yProps(0)}
            />
            <Tab
              icon={<Speed />}
              label="Performance"
              {...a11yProps(1)}
            />
            <Tab
              icon={<Timeline />}
              label="Workflow"
              {...a11yProps(2)}
            />
          </Tabs>
        </Paper>
      </AppBar>

      <Box sx={{ 
        backgroundColor: theme.palette.background.default,
        minHeight: 'calc(100vh - 128px)',
      }}>
        <TabPanel value={activeTab} index={0}>
          <ServiceHealth />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <PerformanceMetrics />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <WorkflowVisualization />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default Dashboard; 