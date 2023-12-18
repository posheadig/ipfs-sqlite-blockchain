import { fetchTokenDetails } from './tokenDetailsIPFS'
import { getTokenBlockchain } from './tokenDetailsB';

(window as any).fetchTokenDetails = fetchTokenDetails;
(window as any).getTokenBlockchain = getTokenBlockchain;