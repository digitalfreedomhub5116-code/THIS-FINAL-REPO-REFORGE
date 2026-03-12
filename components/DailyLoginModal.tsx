import React from 'react';
import DailyChestModal from './DailyChestModal';
import { DailyReward } from '../types';

interface DailyLoginModalProps {
  reward: DailyReward;
  onClose: () => void;
}

const DailyLoginModal: React.FC<DailyLoginModalProps> = ({ reward, onClose }) => (
  <DailyChestModal reward={reward} onClose={onClose} />
);

export default DailyLoginModal;
