import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Description,
  Image as ImageIcon,
  Refresh
} from '@mui/icons-material';
import useReceipts from '../hooks/useReceipts.js';
import ReceiptChatPanel from '../components/receipts/ReceiptChatPanel.jsx';

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];

const statusColorMap = {
  ready: 'success',
  processing: 'warning',
  error: 'error'
};

const ReceiptMetadata = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {label}
    </Typography>
    <Typography variant="body1" fontWeight={600}>
      {value ?? '—'}
    </Typography>
  </Box>
);

ReceiptMetadata.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted = value >= 10 || unitIndex === 0
    ? Math.round(value)
    : value.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
};

const ReceiptsPage = ({ user }) => {
  const fileInputRef = useRef(null);
  const [localError, setLocalError] = useState('');

  const {
    receipts,
    selectedReceipt,
    selectedReceiptId,
    loading,
    uploading,
    error,
    clearError,
    uploadReceipt,
    deleteReceipt,
    selectReceipt,
    receiptImageUrl,
    reloadReceipts
  } = useReceipts(user);

  const displayError = localError || error;

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) {
      return;
    }

    if (files.length > 10) {
      setLocalError('Please select 10 images or fewer per receipt.');
      return;
    }

    const invalidFile = files.find((file) => !ALLOWED_FILE_TYPES.includes(file.type));
    if (invalidFile) {
      setLocalError('Unsupported file type. Please upload PNG, JPG, WEBP, or HEIC images only.');
      return;
    }

    uploadReceipt(files);
  };

  const handleFileChange = (event) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {displayError && (
        <Alert
          severity="error"
          onClose={() => {
            setLocalError('');
            clearError();
          }}
        >
          {displayError}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 3,
          borderStyle: 'dashed',
          borderWidth: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFiles(event.dataTransfer.files);
        }}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            Upload grocery receipt
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Drop one or more receipt photos (max 10) or choose files to have them stitched, OCR’d, and added to your history.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tip: Select images in order from top to bottom—the server will stitch them vertically into a single receipt.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={reloadReceipts}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            component="label"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Choose Image(s)'}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 3, minHeight: 420 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Receipts</Typography>
              {loading && <CircularProgress size={20} />}
            </Stack>

            {receipts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Description sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Upload your first receipt to get started.
                </Typography>
              </Box>
            ) : (
              <List>
                {receipts.map((receipt) => (
                  <ListItem
                    key={receipt._id}
                    selected={receipt._id === selectedReceiptId}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      border: '1px solid',
                      borderColor: receipt._id === selectedReceiptId ? 'primary.main' : 'divider',
                      cursor: 'pointer'
                    }}
                    onClick={() => selectReceipt(receipt._id)}
                    secondaryAction={(
                      <IconButton
                        edge="end"
                        aria-label="delete receipt"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteReceipt(receipt._id);
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <Description />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        receipt.merchant || receipt.originalFilename
                          ? `${receipt.merchant || receipt.originalFilename}${receipt.pageCount > 1 ? ` (${receipt.pageCount} pages)` : ''}`
                          : 'Unknown merchant'
                      }
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {receipt.purchaseDate || 'No date'}
                          </Typography>
                          <Chip
                            label={receipt.status}
                            size="small"
                            color={statusColorMap[receipt.status] || 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, minHeight: 420 }}>
            {selectedReceipt ? (
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Merchant
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {selectedReceipt.merchant || 'Unknown'}
                    </Typography>
                  </Box>
                  <Chip
                    label={selectedReceipt.status}
                    color={statusColorMap[selectedReceipt.status] || 'default'}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <ReceiptMetadata label="Purchase Date" value={selectedReceipt.purchaseDate} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <ReceiptMetadata
                      label="Total"
                      value={selectedReceipt.total ? `${selectedReceipt.currency || '$'}${selectedReceipt.total}` : '—'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <ReceiptMetadata label="Items detected" value={selectedReceipt.items?.length || 0} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <ReceiptMetadata label="Pages combined" value={selectedReceipt.pageCount || 1} />
                  </Grid>
                </Grid>

                {selectedReceipt.items?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" mb={1}>
                      Items
                    </Typography>
                    <Paper variant="outlined" sx={{ borderRadius: 2, maxHeight: 180, overflowY: 'auto' }}>
                      <List dense>
                        {selectedReceipt.items.map((item) => (
                          <ListItem key={`${selectedReceipt._id}-${item.name}`}>
                            <ListItemText
                              primary={item.name}
                              secondary={item.price ? `${item.currency || selectedReceipt.currency || '$'}${item.price}` : '—'}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                )}

                {selectedReceipt.sourceImages?.length > 1 && (
                  <Box>
                    <Typography variant="subtitle2" mb={1}>
                      Uploaded images
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedReceipt.sourceImages.map((image, index) => (
                        <Chip
                          key={`${selectedReceipt._id}-source-${image.filename || index}`}
                          label={`${image.filename || `Image ${index + 1}`} ${formatBytes(image.size) ? `(${formatBytes(image.size)})` : ''}`}
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Divider />

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  {receiptImageUrl(selectedReceipt._id) && (
                    <Paper
                      variant="outlined"
                      sx={{
                        flex: 1,
                        borderRadius: 2,
                        overflow: 'hidden',
                        maxHeight: 320,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'background.default'
                      }}
                    >
                      <img
                        src={receiptImageUrl(selectedReceipt._id)}
                        alt="Receipt"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </Paper>
                  )}
                  <Paper
                    variant="outlined"
                    sx={{
                      flex: 1,
                      borderRadius: 2,
                      p: 2,
                      maxHeight: 320,
                      overflowY: 'auto'
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      <ImageIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2">OCR Text</Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                      }}
                    >
                      {selectedReceipt.rawText || 'No OCR output yet.'}
                    </Typography>
                  </Paper>
                </Stack>
              </Stack>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <ImageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Select a receipt to view details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a receipt from the list to see OCR output, metadata, and line items.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <ReceiptChatPanel
        userId={user._id}
        receipts={receipts}
        onSelectReceipt={selectReceipt}
      />
    </Box>
  );
};

ReceiptsPage.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired
  }).isRequired
};

export default ReceiptsPage;

