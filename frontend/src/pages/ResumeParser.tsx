// ** React Imports
import { useState, ElementType, ChangeEvent, SyntheticEvent, useEffect } from 'react'
import axios, {CancelTokenSource} from 'axios'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Alert from '@mui/material/Alert'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { styled } from '@mui/material/styles'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import InputLabel from '@mui/material/InputLabel'
import AlertTitle from '@mui/material/AlertTitle'
import IconButton from '@mui/material/IconButton'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import Button, { ButtonProps } from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import { Container, Input } from '@mui/material'

import Close from 'mdi-material-ui/Close'
import { AlertBox } from 'mdi-material-ui'

const ImgStyled = styled('img')(({ theme }) => ({
    width: 80,
    height: 80,
    marginRight: theme.spacing(6.25),
    borderRadius: theme.shape.borderRadius
}))

const ButtonStyled = styled(Button)<ButtonProps & { component?: ElementType; htmlFor?: string }>(({ theme }) => ({
    [theme.breakpoints.down('sm')]: {
        width: '100%',
        textAlign: 'center'
    }
}))

const ResetButtonStyled = styled(Button)<ButtonProps>(({ theme }) => ({
    marginLeft: theme.spacing(4.5),
    [theme.breakpoints.down('sm')]: {
        width: '100%',
        marginLeft: 0,
        textAlign: 'center',
        marginTop: theme.spacing(4)
    }
}))

interface FolderUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
    webkitdirectory?: string;
    directory?: string;
}

interface Response{
    filename: string,
    message: string,
    error: string
}

const ResumeParser = () => {
    // ** State
    const [file, setFile] = useState<File | null>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [format, setFormat] = useState<string>('json')
    const [outputFolder, setOutputFolder] = useState("")
    const [fileName, setFileName] = useState<string>("")
    const [uploadTime, setUploadTime] = useState<string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>('');
    const [messages, setMessages] = useState<Response[]>([])
    const [showAlert, setShowAlert] = useState<boolean>(false)

    const [requestCancelToken, setRequestCancelToken] = useState<CancelTokenSource|undefined>(undefined)

    // const onChange = (file: ChangeEvent) => {
    //     const reader = new FileReader()
    //     const { files } = file.target as HTMLInputElement
    //     if (files && files.length !== 0) {
    //         const file = files[0];

    //         reader.onload = () => {
    //             setFile(file);
    //             setFileName(file.name)
    //             setUploadTime(new Date().toLocaleString())
    //             setShowAlert(false)
    //             setMessage('')
    //             setError('')
    //         }

    //         reader.readAsDataURL(file)
    //     }
    // }

    const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            const validFiles = files.filter(file => /(\.pdf|\.docx?)$/i.test(file.name) && file.size <= 5 * 1024 * 1024); // Example validation for PDF, DOCX, DOC files and size <= 5MB

            if (files.length !== validFiles.length) {
                setError("Some files were not accepted. Only PDF, DOCX, or DOC files under 5MB are allowed.");
                setShowAlert(true);
            } else {
                setShowAlert(false);
            }

            setSelectedFiles(validFiles);
        }
    };
    

    const handleReset = () => {
        setSelectedFiles([])
        setFileName('')
        setUploadTime('')
        setError('')
        setMessages([])
    }

    const handleChange = (event: SelectChangeEvent) => {
        setFormat(event.target.value as 'json' | 'spreadsheet')
    }

    const onSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!selectedFiles.length) {
            setError('Resume folder  is not selected. Please upload resumes.')
            setShowAlert(true)
            return;
        }

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        })

        formData.append('format', format)
        formData.append('output_folder', outputFolder)

        setIsLoading(true)
        try {
            const CancelTokenSource = axios.CancelToken.source();
            setRequestCancelToken(CancelTokenSource)

            const response = await axios.post('http://localhost:5000/parse-resume-folder', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                cancelToken: CancelTokenSource.token
            });
            console.log(response.data);
            setIsLoading(false)
            setError('')
            setMessages(response.data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                setError(error.response.data.error);
                setMessages([]);
            }            
            setIsLoading(false)
        }

        setShowAlert(true)
    }

    const handleCancelRequest = () => {
        if (requestCancelToken) {
            requestCancelToken.cancel('User cancelled the request');
        }
    }

    return (
        <Container maxWidth="md">
            <CardContent>
                <form>
                    <Grid container spacing={7}>
                        <Grid item xs={12} sx={{ marginTop: 4.8, marginBottom: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ImgStyled src='/images/ocr.svg' alt='Resume Pic' />
                                <Box>
                                    <Input
                                        type="file"
                                        inputProps={{ webkitdirectory: 'true', directory: 'true' }}
                                        onChange={handleFolderChange}
                                    />
                                    <ResetButtonStyled color='error' variant='outlined' onClick={handleReset}>
                                        Reset
                                    </ResetButtonStyled>
                                    <Typography variant="body1">Selected Files:</Typography>
                                    <ul>
                                        {selectedFiles.map((file, index) => (
                                            <li key={index}>{file.name}</li>
                                        ))}
                                    </ul>
                                </Box>
                            </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Output Format</InputLabel>
                                <Select label='Output Format' onChange={handleChange} value={format}>
                                    <MenuItem value='json' selected>JSON</MenuItem>
                                    <MenuItem value='spreadsheet'>Spreadsheet</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <Button variant='contained' sx={{ marginRight: 3.5 }} onClick={onSubmit}>
                                Parse Resumes
                            </Button>
                            <Button type='reset' variant='outlined' color='secondary' onClick={handleCancelRequest}>
                                Cancel
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </CardContent>
            {isLoading && <LinearProgress />}
            <Grid item xs={12} sx={{ mb: 3 }}>
            {(showAlert && error) ? (
              <Alert
                severity='warning'
                sx={{ '& a': { fontWeight: 400 } }}
                action={
                  <IconButton size='small' color='inherit' aria-label='close' onClick={() => setShowAlert(false)}>
                    <Close fontSize='inherit' />
                  </IconButton>
                }
              >
                <AlertTitle>{error}</AlertTitle>
              </Alert>
          ) : null}
            {(showAlert && messages.length) ? (
              <Alert
                severity='success'
                sx={{ '& a': { fontWeight: 400 } }}
                action={
                  <IconButton size='small' color='inherit' aria-label='close' onClick={() => setShowAlert(false)}>
                    <Close fontSize='inherit' />
                  </IconButton>
                }
              >
                {messages.map(message => <>
                    <AlertTitle>{message.filename}</AlertTitle>
                    <Typography variant='body2'>{message.message}</Typography>
                    <Typography variant='body2'>{message.error}</Typography>
                </>)}
              </Alert>
          ) : null}
          </Grid>
        </Container>
    )
}

export default ResumeParser
