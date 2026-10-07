// by Cleyvin

import React, { ReactNode, useEffect, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';

interface Props {
  /** Candidate URLs, tried in order until one loads. */
  sources: (string | undefined | null)[];
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Shown when there is no source or every source failed. */
  fallback: ReactNode;
  accessibilityLabel?: string;
}

const RemoteImage = ({ sources, style, contentFit = 'cover', fallback, accessibilityLabel }: Props) => {
  const urls = sources.filter((source): source is string => !!source);
  const key = urls.join('|');
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [key]);

  const uri = urls[index];
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          transition={150}
          onError={() => setIndex((current) => current + 1)}
          accessibilityLabel={accessibilityLabel}
        />
      ) : (
        fallback
      )}
    </View>
  );
};

export default RemoteImage;
