import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon
} from '@mui/icons-material';

export interface SmartReplyProps {
  emailId: string;
  style?: 'formal' | 'casual' | 'friendly';
  onSelectReply: (reply: string) => void;
}

export interface SmartReplyService {
  generateReply: (emailId: string, style: string) => Promise<string[]>;
}

export const SmartReply: React.FC<SmartReplyProps> = ({
  emailId,
  style = 'formal',
  onSelectReply
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(style);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleStyleChange = async (
    _event: React.MouseEvent<HTMLElement>,
    newStyle: string | null
  ) => {
    if (newStyle !== null) {
      setSelectedStyle(newStyle);
      await generateSuggestions(newStyle);
    }
  };

  const generateSuggestions = async (currentStyle: string) => {
    try {
      setLoading(true);
      setError(null);
      // This would be replaced with an actual API call
      const response = await fetch(`/api/ai/smart-reply/${emailId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ style: currentStyle }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  useEffect(() => {
    generateSuggestions(style);
  }, [emailId, style]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <AIIcon color="primary" />
          Smart Reply
        </Typography>

        <ToggleButtonGroup
          value={selectedStyle}
          exclusive
          onChange={handleStyleChange}
          size="small"
        >
          <ToggleButton value="formal">Formal</ToggleButton>
          <ToggleButton value="casual">Casual</ToggleButton>
          <ToggleButton value="friendly">Friendly</ToggleButton>
        </ToggleButtonGroup>

        <Tooltip title="Regenerate suggestions">
          <IconButton
            onClick={() => generateSuggestions(selectedStyle)}
            disabled={loading}
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" sx={{ py: 2 }}>
          {error}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {suggestions.map((suggestion, index) => (
            <Card
              key={index}
              variant="outlined"
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
            >
              <CardContent sx={{ position: 'relative', '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" sx={{ pr: 8 }}>
                  {suggestion}
                </Typography>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    gap: 1
                  }}
                >
                  <Tooltip title="Copy">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(suggestion, index);
                      }}
                    >
                      {copiedIndex === index ? <CheckIcon /> : <CopyIcon />}
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => onSelectReply(suggestion)}
                  >
                    Use
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SmartReply; 