import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, MenuItem, FormControl, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
  { code: 'om', name: 'Afaan Oromoo', flag: '🇪🇹' },
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const theme = useTheme();

  const handleLanguageChange = (event: any) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
    console.log('Language changed to:', newLang);
  };

  return (
    <Box>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={i18n.language || 'en'}
          onChange={handleLanguageChange}
          displayEmpty
          renderValue={(value) => {
            const lang = languages.find(l => l.code === value);
            return lang ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </Box>
            ) : '';
          }}
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? '#8FA998' : '#1A4A3A',
            color: 'white',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '& .MuiSelect-icon': {
              color: 'white',
            },
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            '&:hover': {
              transform: 'scale(1.05) translateY(-2px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          {languages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: '20px' }}>{lang.flag}</span>
                <span>{lang.name}</span>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
